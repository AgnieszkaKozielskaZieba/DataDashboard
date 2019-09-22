var geoData;
var emmissionsData;
var valueToCheck;
var countryId;
var selYear;
var minYear;
var maxYear;
var width,height, pie_width,pie_height,country_width,country_height

d3.queue()
.defer(d3.json,'//unpkg.com/world-atlas@1.1.4/world/50m.json')
.defer(d3.csv,"./data/all_data.csv",function(row){
	return{
		continent:row.Continent,
		country:row.Country,
		countryCode:row["Country Code"],
		emissions:+row.Emissions,
		emissionsPerCapita:+row["Emissions Per Capita"],
		year:+row.Year
	}
})
.await((err,mapData,emData)=>{
	if (err) throw err;

	geoData=topojson.feature(mapData,mapData.objects.countries).features;
	emmissionsData=emData;
	valueToCheck="emissionsPerCapita"
	countryId=geoData[0].id;

	minYear=d3.min(emmissionsData,d=>d.year)
	maxYear=d3.max(emmissionsData,d=>d.year)
	selYear=minYear;

	d3.select("#selYear")
	.property("min",minYear)
	.property("max",maxYear)
	.property("value",minYear)
	.on("input",()=>{
		selYear=d3.event.target.value
		setColors()
		drawPieChart()
	})

	d3.selectAll("input[name='Emissions']")
	.on("change",()=>{
		valueToCheck=d3.event.target.value
		setColors()
		drawPieChart()
		drawCountryChart()
	})

	setColors()
	drawPieChart()
	drawCountryChart()
})

function setColors(){

	width=d3.select("#mapContainer").node().getBoundingClientRect().width;
	height=2*width/3;

	var projection=d3.geoMercator()
	.scale(width/7)
	.translate([width/2,height/1.4])

	var path=d3.geoPath()
	.projection(projection);

	var colors = ["#f1c40f", "#e67e22", "#e74c3c", "#c0392b"];

	var domains = {
	emissions: [0, 2.5e5, 1e6, 5e6],
	emissionsPerCapita: [0, 0.5, 2, 10]
	};

	var scale=d3.scaleLinear()
                        .domain(domains[valueToCheck])
                        .range(colors);

	geoData.forEach(country=>{
		filteredData=emmissionsData.filter(d=>d.year==selYear&&d.countryCode==country.id);
		if(filteredData.length>0){
			country.properties=filteredData[0]
		}else{
			country.properties={
					continent:"NN",
					country:"NN",
					countryCode:country.id,
					emissions:"NN",
					emissionsPerCapita:"NN",
					year:selYear
				}
		}
	})

	d3.select("#map")
	.selectAll(".country")
	.exit()
	.remove()

	d3.select("#map")
	.attr("width",width)
	.attr("height",height)
	.selectAll(".country")
	.data(geoData)
	.enter()
	.append("path")
	.classed("country",true)
	.attr("d",path)
	.on("click",d=>{
		countryId=d.properties.countryCode
		drawCountryChart()
	})
	.on("mouseover",d=>{
		d3.select(".tooltip")
		.html(`
			<p>Continent: ${d.properties.continent}</p>
			<p>Country: ${d.properties.country}</p>
			<p>Emissions: ${d.properties.emissions}</p>
			<p>Emissions Per Capita: ${d.properties.emissionsPerCapita}</p>
			`)
		.style("opacity",1)
		.style("top",d3.event.y+"px")
		.style("left",d3.event.x+"px")
	})
	.on("mouseout",()=>{
		d3.select(".tooltip")
		.style("opacity",0)
	})

	d3.selectAll(".country")
	.transition()
	.duration(1)
	.ease(d3.easeBackIn)
	.attr("fill",d=>{
		return d.properties[valueToCheck]!=="NN"?scale(d.properties[valueToCheck]):"#ccc"
	})
}

function drawPieChart(){
	let padding=25;
	pie_width=d3.select("#pieChartContainer").node().getBoundingClientRect().width*0.8;
	pie_height=pie_width;

	var continents=["Asia","Europe","Africa","Americas","Australia","Oceania","NN"]

	var pieColorScale=d3.scaleOrdinal()
	.domain(continents)
	.range(["green","blue","yellow","red","orange","purple","grey"])

	var chart=d3.select("#pieChart")
	.attr("width",pie_width)
	.attr("height",pie_height)
	.append("g")
	.attr("transform",`translate(${pie_width/2},${pie_height/2})`)
	.classed("pieChart",true)

	var arcs=d3.pie()
	.value(d=>d.properties[valueToCheck])
	.sort((a,b)=>{
		if (a.properties.continent>b.properties.continent) return 1
		if (a.properties.continent<b.properties.continent) return -1
		return b.properties[valueToCheck]-a.properties[valueToCheck]
	})
	(geoData)

	var piePath=d3.arc()
	.outerRadius(pie_height/2-padding)
	.innerRadius(0)

	var pieChart=d3.select(".pieChart")
	.selectAll(".arc")
	.data(arcs)

	pieChart
	.exit()
	.remove()

	pieChart
	.enter()
	.append("path")
	.classed("arc",true)
	.merge(pieChart)
	.attr("stroke","black")
	.attr("fill",d=>{
		return pieColorScale(d.data.properties.continent)
	})
	.attr("d",piePath)
}

function drawCountryChart(){
	var countryData=emmissionsData.filter(d=>d.countryCode===countryId)
	country_width=d3.select("#countryChartContainer").node().getBoundingClientRect().width*0.8;
	country_height=country_width
	var barPadding=5;
	let padding=50;

	minYear=d3.min(countryData, d=>d.year)
	maxYear=d3.max(countryData, d=>d.year)

	var xScale=d3.scaleLinear()
	.domain(d3.extent(countryData,d=>d.year))
	.range([padding,country_width-padding])

	var yearArr=[]
	for(let i=minYear;i<=maxYear;i++){
		yearArr.push(i)
	}

	var histogram=d3.histogram()
	.domain(xScale.domain())
	.thresholds(yearArr)
	.value(d=>d["year"])

	var bins=histogram(countryData)

	var yScale=d3.scaleLinear()
	.domain([0,d3.max(bins,d=>d[0][valueToCheck])])
	.range([country_height-padding,padding])

	var xAxis=d3.axisBottom(xScale)
	.tickFormat(d3.format(".0f"))
	var yAxis=d3.axisLeft(yScale);

	var bars=d3.select("#countryChart")
	.attr("width",country_width)
	.attr("height",country_height)
	.selectAll(".bar")
	.data(bins)

	bars
	.exit()
	.remove()

	var g=bars
	.enter()
	.append("g")
	.classed("bar", true)

	g
	.append("rect")

	g
	.merge(bars)
	.select("rect")
	.attr("x",(d,i)=>xScale(d.x0))
	.attr("y",d=>yScale(d[0][valueToCheck]))
	.attr("width",d=>xScale(d.x1)-xScale(d.x0)-barPadding)
	.attr("height",d=>{
		return country_height-padding-yScale(d[0][valueToCheck])
	})
	.attr("fill","green")

	d3.select("#countryChart")
	.selectAll(".axis")
	.remove()

	d3.select("#countryChart")
	.append("g")
	.classed("axis",true)
	.attr("transform","translate(0,"+(country_height-padding)+")")
	.call(xAxis)

	d3.select("#countryChart")
	.append("g")
	.classed("axis",true)
	.attr("transform","translate("+padding+","+(0)+")")
	.call(yAxis)
}