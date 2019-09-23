var geoData;
var emmissionsData;
var valueToCheck;
var countryId;
var selYear;
var minYear;
var maxYear;
var xScale, yScale;

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
	valueToCheck="emissions"
	countryId=geoData[0].id;

	minYear=d3.min(emmissionsData,d=>d.year)
	maxYear=d3.max(emmissionsData,d=>d.year)
	selYear=maxYear;

	var selYearLabel=d3.select("#selYearLabel")
	.text("Year: "+selYear)

	d3.select("#selYear")
	.property("min",minYear)
	.property("max",maxYear)
	.property("value",selYear)
	.on("input",()=>{
		d3.event.preventDefault()
		selYear=d3.event.target.value
		selYearLabel.text("Year: "+selYear)
		setColors()
		drawPieChart()
	})

	d3.selectAll("input[name='Emissions']")
	.on("change",()=>{
		d3.event.preventDefault()
		valueToCheck=d3.event.target.value
		setColors()
		drawPieChart()
		drawCountryChart()
	})

	setColors()
	drawPieChart()
	drawCountryChart()
	d3.select(window).on('resize', resizeElements);
})

function resizeElements(){
	resizeMap();
	resizePieChart();
	resizeCountryChart();
}

function resizeCountryChart(){
	let countryData=emmissionsData.filter(d=>d.countryCode===countryId)
	let country_width=d3.select("#countryChartContainer").node().getBoundingClientRect().width;
	let country_height=country_width
	let barPadding=1;
	let padding=50;

	xScale.range([padding,country_width-padding])

	yScale.range([country_height-padding,padding])

	let xAxis=d3.axisBottom(xScale)
	.tickFormat(d3.format(".0f"))
	var yAxis=d3.axisLeft(yScale);

	let bars=d3.select("#countryChart")
	.attr("width",country_width)
	.attr("height",country_height)
	.selectAll(".bar")

	bars
	.select("rect")
	.attr("x",(d,i)=>{
		return xScale(d.x0)})
	.attr("y",d=>yScale(d[0][valueToCheck]))
	.attr("width",d=>{
		if (d.x1===d.x0){
			return xScale(d.x1+1)-xScale(d.x0)-barPadding
		}
		return xScale(d.x1)-xScale(d.x0)-barPadding})
	.attr("height",d=>{
		return country_height-padding-yScale(d[0][valueToCheck])
	})

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

	d3.select("#countryChart")
	.select(".countryLabel")
		.attr("x",padding+"px")
}

function resizeMap(){
	let width=d3.select("#mapContainer").node().getBoundingClientRect().width;
	let height=2*width/3;

	let projection=d3.geoMercator()
	.scale(width/7)
	.translate([width/2,height/1.4])

	let path=d3.geoPath()
	.projection(projection);

	d3.select("#map")
	.attr("width",width)
	.attr("height",height)
	.selectAll(".country")
	.attr("d",path)
}

function resizePieChart(){
	let padding=25;
	let pie_width=d3.select("#pieChartContainer").node().getBoundingClientRect().width;
	let pie_height=pie_width;

	let chart=d3.select("#pieChart")
	.attr("width",pie_width)
	.attr("height",pie_height)
	.selectAll("g")
	.attr("transform",`translate(${pie_width/2},${pie_height/2})`)

	let piePath=d3.arc()
	.outerRadius(pie_height/2-padding)
	.innerRadius(0)

	let pieChart=d3.select(".pieChart")
	.selectAll(".arc")
	.attr("d",piePath)
}

function setColors(){
	let colors = ["#f1c40f", "#e67e22", "#e74c3c", "#c0392b"];

	let domains = {
	emissions: [0, 2.5e5, 1e6, 5e6],
	emissionsPerCapita: [0, 0.5, 2, 10]
	};

	let scale=d3.scaleLinear()
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
	.selectAll(".country")
	.data(geoData)
	.enter()
	.append("path")
	.classed("country",true)
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

	resizeMap();

	d3.selectAll(".country")
	.transition()
	.duration(1)
	.ease(d3.easeBackIn)
	.attr("fill",d=>{
		return d.properties[valueToCheck]!=="NN"?scale(d.properties[valueToCheck]):"#ccc"
	})
}

function drawPieChart(){

	let continents=["Africa","Americas","Asia","Europe","Australia","Oceania","NN"]

	let pieColorScale=d3.scaleOrdinal()
	.domain(continents)
	.range(["#ffe600","#f1c40f", "#e67e22", "#e74c3c", "#c0392b","#8b2217","grey"])

	let chart=d3.select("#pieChart")
	.append("g")
	.classed("pieChart",true)

	let arcs=d3.pie()
	.value(d=>d.properties[valueToCheck])
	.sort((a,b)=>{
		if (a.properties.continent>b.properties.continent) return 1
		if (a.properties.continent<b.properties.continent) return -1
		return b.properties[valueToCheck]-a.properties[valueToCheck]
	})
	(geoData)

	let pieChart=d3.select(".pieChart")
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
	.on("click",d=>{
		countryId=d.data.properties.countryCode
		drawCountryChart()
	})
	.on("mouseover",d=>{
		d3.select(".tooltip")
		.html(`
			<p>Continent: ${d.data.properties.continent}</p>
			<p>Country: ${d.data.properties.country}</p>
			<p>Emissions: ${d.data.properties.emissions}</p>
			<p>Emissions Per Capita: ${d.data.properties.emissionsPerCapita}</p>
			`)
		.style("opacity",1)
		.style("top",d3.event.y+"px")
		.style("left",d3.event.x+"px")
	})
	.on("mouseout",()=>{
		d3.select(".tooltip")
		.style("opacity",0)
	})

	resizePieChart()
}

function drawCountryChart(){
	let countryData=emmissionsData.filter(d=>d.countryCode===countryId)
	minYear=d3.min(countryData, d=>d.year)
	maxYear=d3.max(countryData, d=>d.year)

	xScale=d3.scaleLinear()
	.domain(d3.extent(countryData,d=>d.year))

	let yearArr=[]
	for(let i=minYear;i<=maxYear+1;i++){
		yearArr.push(i)
	}

	let histogram=d3.histogram()
	.domain(xScale.domain())
	.thresholds(yearArr)
	.value(d=>d["year"])



	let bins=histogram(countryData)

	yScale=d3.scaleLinear()
	.domain([0,d3.max(bins,d=>d[0][valueToCheck])])

	d3.select("#countryChart")
	.select(".countryLabel")
	.remove()

	let text=d3.select("#countryChart")
	.append("text")
	.classed("countryLabel",true)
	.text(countryData[0]["country"]+", "+countryData[0]["continent"])
	.attr("y","20px")
	.attr("font-size", "20px")
	.attr("fill", "black");

	let bars=d3.select("#countryChart")
	.selectAll(".bar")
	.data(bins)

	bars
	.exit()
	.remove()

	let g=bars
	.enter()
	.append("g")
	.classed("bar", true)

	g
	.append("rect")

	g
	.merge(bars)
	.select("rect")
	.attr("fill","#c0392b")

	d3.select("#countryChart")
	.selectAll(".axis")
	.remove()

	resizeCountryChart()
}