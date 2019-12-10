/////////// NOTE ////////////////
// THIS IS FROM
// https://www.doc.gold.ac.uk/~esoer001/mljs-noglpk-module.js
// WITH SOME SLIGHT MODIFACTIONS TO SUIT MY USE CASE
// I AM NOT THE AUTHOR

// see the original LALO package for info




(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.returnExports = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
/////////////////////////////////////
/// Stand alone lalolib base functions
////////////////////////////////////
var printPrecision = 3; // number of digits to print

var LALOLibPlotsIndex = 0;
var LALOLibPlots = new Array();
var LALOLABPLOTMOVING = false;

//////////////////////////
//// Cross-browser compatibility
///////////////////////////

if( typeof(console) == "undefined" ) {
	// for Safari
	var console = {log: function ( ) { } };
}

if( typeof(Math.sign) == "undefined" ) {
	// for IE, Safari
	Math.sign = function ( x ) { return ( x>=0 ? (x==0 ? 0 : 1) : -1 ) ;}
}

//////////////////////////
//// printing
///////////////////////////

function laloprint( x , htmlId, append ) {
	/*
		use print(x) to print to the standard LALOLabOutput

		use print(x, id) to print to another html entity

		use str = print(x, true) to get the resulting string
	*/

	if ( typeof(htmlId) == "undefined" )
		var htmlId = "LALOLibOutput";
	if ( typeof(append) == "undefined" )
		var append = true;

	return printMat(x, size(x), htmlId, append ) ;
}

function printMat(A, size, htmlId, append) {
	if (typeof(append) === "undefined")
		var append = false;
	if ( typeof(htmlId) == "undefined" || htmlId === true ) {
		// return a string as [ [ .. , .. ] , [.. , ..] ]
		if ( type(A) == "matrix" ) {
			var str = "[";
			var i;
			var j;
			var m = size[0];
			var n = size[1];

			for (i=0;i<m; i++) {
				str += "[";
				for ( j=0; j< n-1; j++)
					str += printNumber(A.val[i*A.n+j]) + ",";
				if ( i < m-1)
					str += printNumber(A.val[i*A.n+j]) + "]; ";
				else
					str += printNumber(A.val[i*A.n+j]) + "]";
			}
			str += "]";
			return str;
		}
		else if (type(A) == "vector" ) {
			var n = A.length;
			var str = "";
			// Vector (one column)
			for (var i=0;i<n; i++) {
				str += "[ " + printNumber(A[i]) + " ]<br>";
			}
			console.log(str);
			return str;
		}
	}
	else {
		// Produce HTML code and load it in htmlId

		var html = "";
		var i;
		var j;

		/*if (domathjax) {
			html = tex ( A ) ;
		}
		else {*/
			if ( isScalar(A) ) {
				html +=  A + "<br>" ;
			}
			else if (type(A) == "vector" ) {
				var n = size[0];

				// Vector (one column)
				for (i=0;i<n; i++) {
					html += "[ " + printNumber(A[i]) + " ]<br>";
				}
			}
			else {
				// Matrix
				var m = size[0];
				var n = size[1];

				for (i=0;i<m; i++) {
					html += "[ ";
					for(j=0;j < n - 1; j++) {
						html += printNumber(A.val[i*A.n+j]) + ", ";
					}
					html += printNumber(A.val[i*A.n+j]) + " ]<br>";
				}
			}
		//}
		if (append)
			document.getElementById(htmlId).innerHTML += html;
		else
			document.getElementById(htmlId).innerHTML = html;
		/*
		if ( domathjax)
			MathJax.Hub.Queue(["Typeset",MathJax.Hub,"output"]);
			*/
	}
}

function printNumber ( x ) {
	switch ( typeof(x) ) {
		case "undefined":
			return "" + 0;// for sparse matrices
			break;
		case "string":
			/*if ( domathjax )
				return "\\verb&" + x + "&";
			else*/
				return x;
			break;
		case "boolean":
			return x;
			break;
		default:
			if ( x == Infinity )
				return "Inf";
			if ( x == -Infinity )
				return "-Inf";
			var x_int = Math.floor(x);
			if ( Math.abs( x - x_int ) < 2.23e-16 ) {
				return "" + x_int;
			}
			else
				return x.toFixed( printPrecision );

			break;
	}
}

//// Error handling

function error( msg ) {
	throw new Error ( msg ) ;
//	postMessage( {"error": msg} );
}


///////////
// Plots
//////////
function plot(multiargs) {
	// plot(x,y,"style", x2,y2,"style",y3,"style",... )

	// Part copied from lalolabworker.js

	var data = new Array();
	var styles = new Array();
	var legends = new Array();
	var minX = Infinity;
	var maxX = -Infinity;
	var minY = Infinity;
	var maxY = -Infinity;

	var p=0; // argument pointer
	var x;
	var y;
	var style;
	var i;
	var n;
	var c = 0; // index of current curve
	while ( p < arguments.length)  {

		if ( type( arguments[p] ) == "vector" ) {

			if ( p + 1 < arguments.length && type ( arguments[p+1] ) == "vector" ) {
				// classic (x,y) arguments
				x = arguments[p];
				y = arguments[p+1];

				p++;
			}
			else {
				// only y provided => x = 0:n
				y = arguments[p];
				x = range(y.length);
			}
		}
		else if ( type( arguments[p] ) == "matrix" ) {
			// argument = [x, y]
			if ( arguments[p].n == 1 ) {
				y = arguments[p].val;
				x = range(y.length);
			}
			else if (arguments[p].m == 1 ) {
				y = arguments[p].val;
				x = range(y.length);
			}
			else if ( arguments[p].n == 2 ) {
				// 2 columns => [x,y]
				x = getCols(arguments[p], [0]);
				y = getCols(arguments[p], [1]);
			}
			else {
				// more columns => trajectories as rows
				x = range(arguments[p].n);
				for ( var row = 0; row < arguments[p].m; row++) {
					y = arguments[p].row(row);
					data[c] = [new Array(x.length), new Array(x.length)];
					for ( i=0; i < x.length; i++) {
						data[c][0][i] = x[i];
						data[c][1][i] = y[i];
						if ( x[i] < minX )
							minX = x[i];
						if(x[i] > maxX )
							maxX = x[i];
						if ( y[i] > maxY )
							maxY = y[i];
						if ( y[i] < minY )
							minY = y[i];

					}

					styles[c] = undefined;
					legends[c] = "";

					// Next curve
					c++;
				}
				p++;
				continue;
			}
		}
		else {
			return "undefined";
		}

		//Style
		style = undefined;
		if ( p + 1 < arguments.length && type ( arguments[p+1] ) == "string" ) {
			style = arguments[p+1];
			p++;
		}
		legend = "";
		if ( p + 1 < arguments.length && type ( arguments[p+1] ) == "string" ) {
			legend = arguments[p+1];
			p++;
		}

		// Add the curve (x,y, style) to plot
		data[c] = [new Array(x.length), new Array(x.length)];
		for ( i=0; i < x.length; i++) {
			data[c][0][i] = x[i];
			data[c][1][i] = y[i];
			if ( x[i] < minX )
				minX = x[i];
			if(x[i] > maxX )
				maxX = x[i];
			if ( y[i] > maxY )
				maxY = y[i];
			if ( y[i] < minY )
				minY = y[i];

		}
		styles[c] = style;
		legends[c] = legend;

		// Next curve
		c++;
		p++; // from next argument
	}

	var widthX = maxX-minX;
	var widthY = Math.max( maxY-minY, 1);

	maxX += 0.1*widthX;
	minX -= 0.1*widthX;
	maxY += 0.1*widthY;
	minY -= 0.1*widthY;

	if ( minY > 0 )
		minY = -0.1*maxY;

	if ( maxY < 0 )
		maxY = -0.1*minY;

	var scaleY = 0.9 * (maxX-minX) / (2*maxY);

	var plotinfo = {"data" : data, "minX" : minX, "maxX" : maxX, "minY" : minY, "maxY": maxY, "styles" : styles, "legend": legends };

	//////// Part from laloplots.html //////////

	var plotid = "LALOLibPlot" + LALOLibPlotsIndex;
	var legendwidth = 50;

	LALOLibOutput.innerHTML += "<br><div style='position:relative;left:0px;top:0px;text-align:left;'> <div><a onmousemove='mouseposition(event," + LALOLibPlotsIndex + ");' onmousedown='mousestartmove(event," + LALOLibPlotsIndex + ");' onmouseup='mousestopmove(event);' onmouseleave='mousestopmove(event);' ondblclick='zoomoriginal(" + LALOLibPlotsIndex + ");'><canvas id='" +plotid + "'  width='500' height='500' style='border: 1px solid black;'></canvas></a></div> <label id='lblposition" + LALOLibPlotsIndex + "'></label> <div style='position: absolute;left: 550px;top: -1em;'> <canvas id='legend" + LALOLibPlotsIndex + "' width='" + legendwidth + "' height='500'></canvas></div> <div id='legendtxt" + LALOLibPlotsIndex + "' style='position: absolute;left: 610px;top: 0;'></div> </div>";

	// prepare legend
	var ylegend = 20;

	// do plot

	LALOLibPlots[LALOLibPlotsIndex] = new Plot(plotid) ;

	LALOLibPlots[LALOLibPlotsIndex].setScalePlot(plotinfo.minX, plotinfo.maxX, 200, plotinfo.scaleY);
	if ( plotinfo.minY && plotinfo.maxY ) {
		LALOLibPlots[LALOLibPlotsIndex].view(plotinfo.minX, plotinfo.maxX, plotinfo.minY, plotinfo.maxY);
	}

	var colors = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,0];

	var p;
	var color;
	for (p = 0; p<plotinfo.data.length; p++) {

		var linestyle = true;
		var pointstyle = true;
		if ( typeof(plotinfo.styles[p]) == "string" ) {
			if ( plotinfo.styles[p].indexOf(".") >= 0 ) {
				linestyle = false;
				plotinfo.styles[p] = plotinfo.styles[p].replace(".","");
			}
			if ( plotinfo.styles[p].indexOf("_") >= 0 ) {
				pointstyle = false;
				plotinfo.styles[p] = plotinfo.styles[p].replace("_","");
			}
			color = parseColor(plotinfo.styles[p]);

			if ( color < 0 )
				color = colors.splice(0,1)[0];		// pick next unused color
			else
				colors.splice(colors.indexOf(color),1); // remove this color
		}
		else
			color = color = colors.splice(0,1)[0];	// pick next unused color

		if ( typeof(color) == "undefined")	// pick black if no next unused color
			color = 0;

		for ( i=0; i < plotinfo.data[p][0].length; i++) {
			if ( pointstyle )
				LALOLibPlots[LALOLibPlotsIndex].addPoint(plotinfo.data[p][0][i],plotinfo.data[p][1][i], color);
			if ( linestyle && i < plotinfo.data[p][0].length-1 )
				LALOLibPlots[LALOLibPlotsIndex].plot_line(plotinfo.data[p][0][i],plotinfo.data[p][1][i], plotinfo.data[p][0][i+1],plotinfo.data[p][1][i+1], color);
		}


		// Legend
		if ( plotinfo.legend[p] != "" ) {
			var ctx = document.getElementById("legend" +LALOLibPlotsIndex).getContext("2d");
			setcolor(ctx, color);
			ctx.lineWidth = "3";
			if ( pointstyle ) {
				ctx.beginPath();
				ctx.arc( legendwidth/2 , ylegend, 5, 0, 2 * Math.PI , true);
				ctx.closePath();
				ctx.fill();
			}
			if( linestyle) {
				ctx.beginPath();
				ctx.moveTo ( 0,ylegend);
				ctx.lineTo (legendwidth, ylegend);
				ctx.stroke();
			}
			ylegend += 20;

			document.getElementById("legendtxt" +LALOLibPlotsIndex).innerHTML += plotinfo.legend[p] + "<br>";
		}
	}
	for ( var pi=0; pi <= LALOLibPlotsIndex; pi++)
		LALOLibPlots[pi].replot();

	// ZOOM
	if(window.addEventListener)
        document.getElementById(plotid).addEventListener('DOMMouseScroll', this.mousezoom, false);//firefox

    //for IE/OPERA etc
    document.getElementById(plotid).onmousewheel = this.mousezoom;

	LALOLibPlotsIndex++;
}

// Color plot
function colorplot(multiargs) {
	// colorplot(x,y,z) or colorplot(X) or colorplot(..., "cmapname" )

	// Part copied from lalolabworker.js

	var minX = Infinity;
	var maxX = -Infinity;
	var minY = Infinity;
	var maxY = -Infinity;
	var minZ = Infinity;
	var maxZ = -Infinity;

	var x;
	var y;
	var z;
	var i;

	var t0 =  type( arguments[0] );
	if ( t0 == "matrix" && arguments[0].n == 3 ) {
		x = getCols(arguments[0], [0]);
		y = getCols(arguments[0], [1]);
		z = getCols(arguments[0], [2]);
	}
	else if ( t0 == "matrix" && arguments[0].n == 2 && type(arguments[1]) == "vector" ) {
		x = getCols(arguments[0], [0]);
		y = getCols(arguments[0], [1]);
		z = arguments[1];
	}
	else if (t0 == "vector" && type(arguments[1]) == "vector" && type(arguments[2]) == "vector") {
		x = arguments[0];
		y = arguments[1];
		z = arguments[2];
	}
	else {
		return "undefined";
	}

	var minX = min(x);
	var maxX = max(x);
	var minY = min(y);
	var maxY = max(y);
	var minZ = min(z);
	var maxZ = max(z);

	var widthX = maxX-minX;
	var widthY = Math.max( maxY-minY, 1);

	maxX += 0.1*widthX;
	minX -= 0.1*widthX;
	maxY += 0.1*widthY;
	minY -= 0.1*widthY;

	if ( minY > 0 )
		minY = -0.1*maxY;

	if ( maxY < 0 )
		maxY = -0.1*minY;

	var plotinfo = {"x" : x, "y": y, "z": z, "minX" : minX, "maxX" : maxX, "minY" : minY, "maxY": maxY,  "minZ" : minZ, "maxZ" : maxZ };

	//////// Part from laloplots.html //////////

	var plotid = "LALOLibPlot" + LALOLibPlotsIndex;
	var legendwidth = 50;


	LALOLibOutput.innerHTML += "<br><div style='position:relative;left:0px;top:0px;text-align:left;'> <div><a onmousemove='mouseposition(event," + LALOLibPlotsIndex + ");' onmousedown='mousestartmove(event," + LALOLibPlotsIndex + ");' onmouseup='mousestopmove(event);' onmouseleave='mousestopmove(event);' ondblclick='zoomoriginal(" + LALOLibPlotsIndex + ");'><canvas id='" +plotid + "'  width='500' height='500' style='border: 1px solid black;'></canvas></a></div> <label id='lblposition" + LALOLibPlotsIndex + "'></label> <div style='position: absolute;left: 550px;top: -1em;'><label id='legendmaxZ" + LALOLibPlotsIndex + "' style='font-family:verdana;font-size:80%;'></label><br>  <canvas id='legend" + LALOLibPlotsIndex + "' width='" + legendwidth + "' height='500'></canvas><br><label id='legendminZ" + LALOLibPlotsIndex + "' style='font-family:verdana;font-size:80%;'></label></div> <div id='legendtxt" + LALOLibPlotsIndex + "' style='position: absolute;left: 610px;top: 0;'></div> </div>";

	LALOLibPlots[LALOLibPlotsIndex] = new ColorPlot(plotid) ;
	LALOLibPlots[LALOLibPlotsIndex].setScale(plotinfo.minX, plotinfo.maxX, plotinfo.minY, plotinfo.maxY,plotinfo.minZ, plotinfo.maxZ);
	LALOLibPlots[LALOLibPlotsIndex].view(plotinfo.minX, plotinfo.maxX, plotinfo.minY, plotinfo.maxY);

	for (var i=0; i < plotinfo.x.length; i++)
		LALOLibPlots[LALOLibPlotsIndex].addPoint(plotinfo.x[i],plotinfo.y[i],plotinfo.z[i]);

	LALOLibPlots[LALOLibPlotsIndex].replot();

	var legendwidth = 50;
//	plotlegend.innerHTML += plotinfo.maxZ.toFixed(3) + "<br><canvas id='legend'  width='" + legendwidth + "' height='500'></canvas><br>" + plotinfo.minZ.toFixed(3);
	var ctx = document.getElementById("legend" +LALOLibPlotsIndex).getContext("2d");

	var legendcanvas = document.getElementById("legend"+LALOLibPlotsIndex);
	if ( legendcanvas )
		var legendheight = legendcanvas.height;
	else
		var legendheight = 500;

	var y;
	for (var i=0; i< LALOLibPlots[LALOLibPlotsIndex].cmap.length;i++) {
		y = Math.floor(i * legendheight / LALOLibPlots[LALOLibPlotsIndex].cmap.length);
		ctx.fillStyle = "rgb(" + LALOLibPlots[LALOLibPlotsIndex].cmap[i][0] + "," + LALOLibPlots[LALOLibPlotsIndex].cmap[i][1] + "," + LALOLibPlots[LALOLibPlotsIndex].cmap[i][2] + ")";
		ctx.fillRect( 0, legendheight-y, legendwidth , (legendheight / LALOLibPlots[LALOLibPlotsIndex].cmap.length) + 1) ;
	}

	document.getElementById("legendmaxZ" + LALOLibPlotsIndex).innerHTML = plotinfo.maxZ.toPrecision(3);
	document.getElementById("legendminZ" + LALOLibPlotsIndex).innerHTML = plotinfo.minZ.toPrecision(3);

	if(window.addEventListener)
        document.getElementById(plotid).addEventListener('DOMMouseScroll', this.mousezoom, false);//firefox

    //for IE/OPERA etc
    document.getElementById(plotid).onmousewheel = this.mousezoom;

	LALOLibPlotsIndex++;
}

// 3D plot
function plot3(multiargs) {
	// plot3(x,y,z,"style", x2,y2,z2,"style",... )

	var data = new Array();
	var styles = new Array();
	var legends = new Array();

	var p=0; // argument pointer
	var x;
	var y;
	var z;
	var style;
	var i;
	var n;
	var c = 0; // index of current curve
	while ( p < arguments.length)  {

		if ( type( arguments[p] ) == "vector" ) {

			if ( p + 2 < arguments.length && type ( arguments[p+1] ) == "vector" && type ( arguments[p+2] ) == "vector" ) {
				// classic (x,y,z) arguments
				x = arguments[p];
				y = arguments[p+1];
				z = arguments[p+2];

				p += 2;
			}
			else {
				return "undefined";
			}
		}
		else if ( type( arguments[p] ) == "matrix" ) {
			// argument = [x, y, z]
			n = arguments[p].length;
			x = new Array(n);
			y = new Array(n);
			z = new Array(n);
			for ( i=0; i < n; i++) {
				x[i] = get(arguments[p], i, 0);
				y[i] = get(arguments[p], i, 1);
				z[i] = get(arguments[p], i, 2);
			}
		}
		else {
			return "undefined";
		}

		//Style
		style = undefined;
		if ( p + 1 < arguments.length && type ( arguments[p+1] ) == "string" ) {
			style = arguments[p+1];
			p++;
		}
		legend = "";
		if ( p + 1 < arguments.length && type ( arguments[p+1] ) == "string" ) {
			legend = arguments[p+1];
			p++;
		}

		// Add the curve (x,y,z, style) to plot
		data[c] = new Array();
		for ( i=0; i < x.length; i++) {
			data[c][i] = [x[i], y[i], z[i]];
		}
		styles[c] = style;
		legends[c] = legend;

		// Next curve
		c++;
		p++; // from next argument

	}


	var plotinfo =  { "data" : data, "styles" : styles, "legend": legends };

	//////// Part from laloplots.html //////////

	var plotid = "LALOLibPlot" + LALOLibPlotsIndex;
	var legendwidth = 50;

	LALOLibOutput.innerHTML += '<br><div style="position:relative;left:0px;top:0px;text-align:left;"> <div><a onmousedown="LALOLibPlots[' + LALOLibPlotsIndex + '].mousedown(event);" onmouseup="LALOLibPlots[' + LALOLibPlotsIndex + '].mouseup(event);" onmousemove="LALOLibPlots[' + LALOLibPlotsIndex + '].mouserotation(event);"><canvas id="' + plotid + '" width="500" height="500" style="border: 1px solid black;" title="Hold down the mouse button to change the view and use the mousewheel to zoom in or out." ></canvas></a></div><label id="lblposition' + LALOLibPlotsIndex + '"></label> <div style="position: absolute;left: 550px;top: -1em;"> <canvas id="legend' + LALOLibPlotsIndex + '" width="' + legendwidth + '" height="500"></canvas></div> <div id="legendtxt' + LALOLibPlotsIndex + '" style="position: absolute;left: 610px;top: 0;"></div> </div>';

	var ylegend = 20;

	// do plot

	LALOLibPlots[LALOLibPlotsIndex] = new Plot3D(plotid) ;

	LALOLibPlots[LALOLibPlotsIndex].cameraDistance = 30;
	LALOLibPlots[LALOLibPlotsIndex].angleX = Math.PI/10;
	LALOLibPlots[LALOLibPlotsIndex].angleZ = Math.PI/10;

	LALOLibPlots[LALOLibPlotsIndex].axisNameX1 = "x";
	LALOLibPlots[LALOLibPlotsIndex].axisNameX2 = "y";
	LALOLibPlots[LALOLibPlotsIndex].axisNameX3 = "z";


	var colors = [1,2,3,4,5,0];

	var p;
	var color;

	for (p = 0; p<plotinfo.data.length; p++) {

		var linestyle = false;
		var pointstyle = true;
		if ( typeof(plotinfo.styles[p]) == "string" ) {
			if ( plotinfo.styles[p].indexOf(".") >= 0 ) {
				linestyle = false;
				plotinfo.styles[p] = plotinfo.styles[p].replace(".","");
			}
			if ( plotinfo.styles[p].indexOf("_") >= 0 ) {
				pointstyle = false;
				plotinfo.styles[p] = plotinfo.styles[p].replace("_","");
			}
			color = parseColor(plotinfo.styles[p]);

			if ( color < 0 )
				color = colors.splice(0,1)[0];		// pick next unused color
			else
				colors.splice(colors.indexOf(color),1); // remove this color
		}
		else
			color = color = colors.splice(0,1)[0];	// pick next unused color

		if ( typeof(color) == "undefined")	// pick black if no next unused color
			color = 0;

		for ( i=0; i < plotinfo.data[p].length; i++) {
			if ( pointstyle ) {
				LALOLibPlots[LALOLibPlotsIndex].X.push( plotinfo.data[p][i] );
				LALOLibPlots[LALOLibPlotsIndex].Y.push( color );
			}
			if ( linestyle && i < plotinfo.data[p].length-1 )
				LALOLibPlots[LALOLibPlotsIndex].plot_line(plotinfo.data[p][i], plotinfo.data[p][i+1], "", color);
		}

		// Legend
		if ( plotinfo.legend[p] != "" ) {
			var ctx = document.getElementById("legend" +LALOLibPlotsIndex).getContext("2d");
			setcolor(ctx, color);
			ctx.lineWidth = "3";
			if ( pointstyle ) {
				ctx.beginPath();
				ctx.arc( legendwidth/2 , ylegend, 5, 0, 2 * Math.PI , true);
				ctx.closePath();
				ctx.fill();
			}
			if( linestyle) {
				ctx.beginPath();
				ctx.moveTo ( 0,ylegend);
				ctx.lineTo (legendwidth, ylegend);
				ctx.stroke();
			}
			ylegend += 20;

			document.getElementById("legendtxt" +LALOLibPlotsIndex).innerHTML += plotinfo.legend[p] + "<br>";
		}
	}
	LALOLibPlots[LALOLibPlotsIndex].computeRanges();
	LALOLibPlots[LALOLibPlotsIndex].replot();

	LALOLibPlotsIndex++;
}

// image
function image(X, title) {
	if (type(X) == "vector")  {
		X = mat([X]);
	}

	var style;
	var minX = min(X);
	var maxX = max(X);
	var m = X.length;
	var n = X.n;
	var scale = (maxX - minX) ;

	var i;
	var j;
	var k = 0;
	var data = new Array();
	for ( i=0; i < m; i++) {
		var Xi = X.row(i);
		for ( j=0; j < n; j++) {	// could do for j in X[i] if colormap for 0 is white...
			color =   mul( ( Xi[j] - minX) / scale, ones(3) ) ;
			data[k] = [i/m, j/n, color];
			k++;
		}
	}
	style  = [m,n,minX,maxX];

	var imagedata =  { "data" : data, "style" : style, "title": title };

	////// Part from laloplots.html


	var plotid = "LALOLibPlot" + LALOLibPlotsIndex;
	var legendwidth = 50;
	var pixWidth ;
	var pixHeight ;

		// prepare legend
	var ylegend = 20;

	// do plot


	var i;

	var width = 500;
	var height = 500;

	var title = imagedata.title;
	if(title) {
		LALOLibOutput.innerHTML += "<h3>"+title+"</h3>" + "  ( " + imagedata.style[0] + " by " + imagedata.style[1] + " matrix )";
	}

	if ( imagedata.style[1] > width ) {
		width = imagedata.style[1];
		plotlegend.style.left = (width+60) +"px";
	}
	if ( imagedata.style[0] > height )
	 	height = imagedata.style[0];

	pixWidth = width / imagedata.style[1];
	pixHeight = height / imagedata.style[0];

	var legendwidth = 50;

	LALOLibOutput.innerHTML += '<div style="position:relative;left:0px;top:0px;text-align:left;"> <div><a onmousemove="mouseimageposition(event,' + LALOLibPlotsIndex + ');"><canvas id="' +plotid + '"  width="' + width + '" height="' + height + '" style="border: 1px solid black;"></canvas></a></div><label id="lblposition' + LALOLibPlotsIndex + '"></label> <div style="position: absolute;left: 550px;top: -1em;">' + imagedata.style[2].toFixed(3) + '<br> <canvas id="legend' + LALOLibPlotsIndex + '" width="' + legendwidth + '" height="500"></canvas> <br>' + imagedata.style[3].toFixed(3) + ' </div>  </div>';

	var x;
	var y;
	var color;

	LALOLibPlots[LALOLibPlotsIndex] = imagedata;
	LALOLibPlots[LALOLibPlotsIndex].canvasId = plotid;
	var canvas = document.getElementById(plotid);

  	if (canvas.getContext) {
		var ctx = canvas.getContext("2d");

		for ( i=0; i < imagedata.data.length ; i++) {
			x = canvas.width * LALOLibPlots[LALOLibPlotsIndex].data[i][1];
			y =  canvas.height * LALOLibPlots[LALOLibPlotsIndex].data[i][0] ;
			color = LALOLibPlots[LALOLibPlotsIndex].data[i][2];

			ctx.fillStyle = "rgb(" + Math.floor(255*(1-color[0])) + "," + Math.floor(255*(1-color[1])) + "," + Math.floor(255*(1-color[2])) + ")";
			ctx.fillRect( x , y, pixWidth +1,  pixHeight +1); // +1 to avoid blank lines between pixels

		}
	}

	// add legend / colormap

	var legend = document.getElementById("legend" +LALOLibPlotsIndex);
	var ctx = legend.getContext("2d");

	for ( i=0; i< 255;i++) {
		y = Math.floor(i * legend.height / 255);
		ctx.fillStyle = "rgb(" + (255-i) + "," + (255-i) + "," + (255-i) + ")";
		ctx.fillRect( 0, y, legendwidth , (legend.height / 255) + 1) ;
	}

	// Prepare mouseposition info
	LALOLibPlots[LALOLibPlotsIndex].pixelWidth = pixWidth;
	LALOLibPlots[LALOLibPlotsIndex].pixelHeight = pixHeight;
	LALOLibPlotsIndex++;
}



function parseColor( str ) {
	if ( typeof(str) == "undefined")
		return -1;

	var color;
	switch( str ) {
	case "k":
	case "black":
		color = 0;
		break;
	case "blue":
	case "b":
		color = 1;
		break;
	case "r":
	case "red":
		color = 2;
		break;
	case "g":
	case "green":
		color = 3;
		break;
	case "m":
	case "magenta":
		color = 4;
		break;
	case "y":
	case "yellow":
		color = 5;
		break;

	default:
		color = -1;
		break;
	}
	return color;
}

function mousezoom ( e, delta , plotidx) {
	if (!e)
    	e = window.event;

 	e.preventDefault();

	if ( typeof(plotidx) == "undefined")
		var plotidx = 0;

	if ( typeof(delta) == "undefined") {
		var delta = 0;

		// normalize the delta
		if (e.wheelDelta) {
		     // IE and Opera
		    delta = e.wheelDelta / 30;
		}
		else if (e.detail) {
		    delta = -e.detail ;
		}
	}
	else {
		if (e.button != 0 )
			delta *= -1;
	}

	var plotcanvas = document.getElementById(LALOLibPlots[plotidx].canvasId);
	var rect = plotcanvas.getBoundingClientRect();
	var x = e.clientX - rect.left;	// mouse coordinates relative to plot
	var y = e.clientY - rect.top;
	LALOLibPlots[plotidx].zoom(1+delta/30,1+delta/30, x, y);
}
function zoomoriginal(plotidx) {
	LALOLibPlots[plotidx].resetzoom();
}
function mouseposition( e , plotidx) {
	var plotcanvas = document.getElementById(LALOLibPlots[plotidx].canvasId);
	var rect = plotcanvas.getBoundingClientRect();

	var xmouse = e.clientX - rect.left;	// mouse coordinates relative to plot
	var ymouse = e.clientY - rect.top;

	if ( LALOLABPLOTMOVING ) {
		var dx = xmouse - LALOLABPLOTxprev ;
		var dy = ymouse - LALOLABPLOTyprev;
		if ( Math.abs( dx ) > 1 || Math.abs( dy ) > 1 ) {
			LALOLibPlots[plotidx].translate(dx, dy);
		}
		LALOLABPLOTxprev = xmouse;
		LALOLABPLOTyprev = ymouse;
	}
	else {
		var x = xmouse / LALOLibPlots[plotidx].scaleX + LALOLibPlots[plotidx].minX;
		var y = (plotcanvas.height - ymouse ) / LALOLibPlots[plotidx].scaleY + LALOLibPlots[plotidx].minY;

		document.getElementById("lblposition" + plotidx).innerHTML = "x = " + x.toFixed(3) + ", y = " + y.toFixed(3);
	}
}

function mousestartmove( e , plotidx) {
	if ( e.button == 0 ) {
		LALOLABPLOTMOVING = true;
		var plotcanvas = document.getElementById(LALOLibPlots[plotidx].canvasId);
		var rect = plotcanvas.getBoundingClientRect();
		LALOLABPLOTxprev = e.clientX - rect.left;	// mouse coordinates relative to plot
		LALOLABPLOTyprev = e.clientY - rect.top;
	}
	else {
		LALOLABPLOTMOVING = false;
	}
}
function mousestopmove( e ) {
	LALOLABPLOTMOVING = false;
}

function mouseimageposition( e, plotidx ) {
	var plotcanvas = document.getElementById(LALOLibPlots[plotidx].canvasId);
	var rect = plotcanvas.getBoundingClientRect();

	var xmouse = e.clientX - rect.left;	// mouse coordinates relative to plot
	var ymouse = e.clientY - rect.top;

	var n = LALOLibPlots[plotidx].style[1];
	var minX = LALOLibPlots[plotidx].style[2];
	var maxX = LALOLibPlots[plotidx].style[3];
	var i = Math.floor(ymouse / LALOLibPlots[plotidx].pixelHeight);
	var j = Math.floor(xmouse / LALOLibPlots[plotidx].pixelWidth );
	if ( j < n ) {
		var val = LALOLibPlots[plotidx].data[i*n + j][2][0]*(maxX - minX) + minX;

		document.getElementById("lblposition" + plotidx).innerHTML = "Matrix[ " + i + " ][ " + j + " ] = " + val.toFixed(3);
	}
}
/////////////////////////////////
//// Parser
////////////////////////////////

function lalo( Command ) {
	// Parse command line and execute in current scopes
	var cmd = laloparse( Command );
	var res = self.eval(cmd);
	return res;
}
function laloparse( WorkerCommand ) {
	// Parse Commands
	var WorkerCommandList = WorkerCommand.split("\n");
	var k;
	var cmd = "";
	for (k = 0; k<WorkerCommandList.length; k++) {
		if( WorkerCommandList[k].length > 0 ) {
		  	if ( WorkerCommandList[k].indexOf("{") >= 0 || WorkerCommandList[k].indexOf("}") >= 0) {
		  		// this line includes braces => plain javascript: do not parse it!
		  		cmd += WorkerCommandList[k];
		  		if ( WorkerCommandList[k].indexOf("}") >= 0 ) {
		  			// braces closed, we can end the line
			  		cmd += " ;\n";
			  	}
		  	}
		  	else {
		  		// standard lalolab line
		  		cmd += parseCommand(WorkerCommandList[k]) + " ;\n";
		  	}
		}
	}
	return cmd;
}
function parseSplittedCommand( cmd ) {
	//console.log("parsing : " + cmd);
	// !!! XXX should parse unary ops before all the others !!!

	var ops = ["==", "!=", ">=" ,"<=", ">", "<" , "\\" ,":", "+", "-",  ".*", "*", "./" ,  "^", "'"]; // from lowest priority to highest
	var opsFcts = ["isEqual" , "isNotEqual", "isGreaterOrEqual", "isLowerOrEqual", "isGreater" , "isLower", "solve","range", "add", "sub", "entrywisemul", "mul" , "entrywisediv",  "pow", "undefined" ];
	var unaryOpsFcts = ["", "", "", "", "","", "","range","", "minus", "", "" , "",  "", "transpose" ];

	var o;
	var i ;
	var k;
	var operandA;
	var operandB;

	for ( o = 0; o < ops.length; o++) {

		var splitted_wrt_op = cmd.split(ops[o]);

		if ( splitted_wrt_op.length > 1) {
			if ( removeSpaces(splitted_wrt_op[0]) != "" ) {
				// there is actually a left-hand side operand
				if( removeSpaces(splitted_wrt_op[1]) != "" ) {
					// and a right-hand side operand
					operandA = parseSplittedCommand(splitted_wrt_op[0]);

					for ( k = 1; k< splitted_wrt_op.length ; k++) {
						operandB = splitted_wrt_op[k];
						operandA =  opsFcts[o] + "(" + operandA +  "," + parseSplittedCommand(operandB) + ")";
					}
					cmd = operandA;
				}
				else {
					// no right-hand side: like transpose operator
					cmd = unaryOpsFcts[o] + "(" + parseSplittedCommand(splitted_wrt_op[0]) + ")";
				}
			}
			else {
				// no left operand: like minus something...

				// Apply unary operator
				operandA = unaryOpsFcts[o] + "(" + parseSplittedCommand(splitted_wrt_op[1]) + ")";

				// and then binary operator for the remaining occurences
				for ( k = 2; k< splitted_wrt_op.length ; k++) {
					operandB = splitted_wrt_op[k];
					operandA =  opsFcts[o] + "(" + operandA +  "," + parseSplittedCommand(operandB) + ")";
				}
				cmd = operandA;
			}
		}
	}

	return cmd;

}

function parseAssignment ( assignmentStr ) {
	if ( assignmentStr.indexOf("[") < 0 ) {
		// straightforward assignment
		return assignmentStr;
	}
	else {
		var assign = removeSpaces(assignmentStr).replace("=","").replace(",","][");
		var middle = assign.indexOf("][");
		var start = assign.indexOf("[");
		var varname = assign.substr(0,start);
		if ( middle >= 0 ) {
			// submatrix assignment
			var rowsrange = assign.substr( start + 1, middle-start-1);

			// find last "]";
			var end = middle+1;
			while ( assign.indexOf("]",end+1) >= 0)
				end = assign.indexOf("]",end+1);

			var colsrange = assign.substr(middle+2, end - (middle+2)); // everything after "]["	and before last "]"

			// Parse colon ranges
			var rowssplit = rowsrange.split(":");
			if (rowssplit.length == 2 ){
				if ( rowssplit[0] =="" && rowssplit[1] =="" )
					rowsrange = "[]";
				else
					rowsrange = "range(" + rowssplit[0] + "," + rowssplit[1] + ")";
			}
			else if ( rowssplit.length == 3)
				rowsrange = "range(" + rowssplit[0] + "," + rowssplit[2] + "," + rowssplit[1] + ")";

			var colssplit = colsrange.split(":");
			if (colssplit.length == 2 ) {
				if ( colssplit[0] =="" && colssplit[1] =="" )
					colsrange = "[]";
				else
					colsrange = "range(" + colssplit[0] + "," + colssplit[1] + ")";
			}
			else if ( colssplit.length == 3)
				colsrange = "range(" + colssplit[0] + "," + colssplit[2] + "," + colssplit[1] + ")";

			return "set( " + varname + "," + rowsrange + "," + colsrange + ", ";
		}
		else {
			// subvector assignment

			// find last "]";
			var end = start;
			while ( assign.indexOf("]",end+1) >= 0)
				end = assign.indexOf("]",end+1);

			var rowsrange = assign.substr( start + 1, end-start-1);

			// Parse colon ranges
			var rowssplit = rowsrange.split(":");
			if (rowssplit.length == 2 ){
				if ( rowssplit[0] =="" && rowssplit[1] =="" )
					rowsrange = "[]";
				else
					rowsrange = "range(" + rowssplit[0] + "," + rowssplit[1] + ")";
			}
			else if ( rowssplit.length == 3)
				rowsrange = "range(" + rowssplit[0] + "," + rowssplit[2] + "," + rowssplit[1] + ")";

			return "set( " + varname + "," + rowsrange + ", ";
		}
	}
}

function parseBrackets( cmdString ) {
	// Parse brackets => get matrix entries

	var delimiters = ["[", "(",",",";",")", "\\", "+", "-", "*", "/", ":", "^", "'", "=", ">", "<", "!"];

	cmdString = cmdString.split("][").join(","); // replace ][ by , and ] by )

	var cmd = cmdString.split("");	// string to array of char

	var i;
	var j;
	var k;
	var l;
	var lhs;

	// For the entire string:
	i = cmd.length - 1;
	while ( i >= 0 ) {
		// Search for the right-most opening bracket:
		while ( i >= 0 && cmd[i] != "[" )
			i--;

		if ( i >= 0 ) {
			// found a bracket,  find its corresponding closing bracket
			j = i+1;
			while ( j < cmd.length && cmd[j] != "]" )
				j++;

			if ( j < cmd.length ) {

				// then determine its left-hand side operand:
				l = 0;
				k = 0;
				while ( k < i ) {
					if ( delimiters.indexOf(cmd[k]) >= 0)
						l = k+1;
					k++;
				}
				lhs = cmd.slice(l,i).join(""); // should be LHS as string or "" if l >= i

				if ( removeSpaces(lhs) == "" ) {
					// if the LHS operand is empty, leave the brackets untouched
					cmd[i] = "#"; // (replace by # and $ re-replace at the end by a matrix creation)

					// look for semicolon within brackets:
					k = i+1;
					var rowwise = false;
					var colwise = false;
					while (  k < j ) {
						if( cmd[k] == "," ) {
							//colwise = true;
						}

						if ( cmd[k] == ";" ) {
							rowwise = true; // mark for rowwise mat

							if ( colwise ) {
								cmd.splice(k,1, ["@", ","] ); // end previous row vector, replace by comma
								colwise = false;
							}
							else {
								cmd[k] = ","; // simply replace by comma
							}
						}


						k++;
					}

					if ( rowwise )
						cmd[j] = "$";
					else
						cmd[j] = "@";

				}
				else {
					// if not empty, implement a GET
					cmd[l]="get(" + lhs ;
					for ( k = l+1; k < i; k++)
						cmd[k] = "";
					cmd[i] = ",";
					cmd[j] = ")";
				}
			}
			else {
				return undefined; // error no ending bracket;
			}
		}
		i--;
	}

	var cmdparsed = cmd.join("").split("#").join("mat([").split("$").join("], true)").split("@").join("])");
	//console.log(cmdparsed);
	return cmdparsed;
}

function parseCommand( cmdString ) {

	// Remove comments at the end of the line
	var idxComments = cmdString.indexOf("//");
	if ( idxComments >= 0 )
		cmdString = cmdString.substr(0,idxComments);


	// Parse "=" sign to divide between assignement String and computeString
	var idxEqual = cmdString.split("==")[0].split("!=")[0].split(">=")[0].split("<=")[0].indexOf("=");
	if ( idxEqual > 0 )  {
		var assignmentStr = parseAssignment( cmdString.substr(0,idxEqual + 1) );
		var computeStr = cmdString.substr(idxEqual+1);

		// Check for simple assignments like A = B to force copy
		if ( assignmentStr.indexOf("set(") < 0 && typeof(self[removeSpaces(computeStr)]) != "undefined" ) { //self.hasOwnProperty( removeSpaces(computeStr) ) ) { // self.hasOwnProperty does not work in Safari workers....

			// computeStr is a varaible name
			if ( !isScalar(self[ removeSpaces(computeStr) ] ) ) {
				// the variable is a vector or matrix
				var FinalCommand = assignmentStr + "matrixCopy(" + computeStr + ")";
				console.log(FinalCommand);
				return FinalCommand;
			}
		}
	}
	else {
		var assignmentStr = "";
		var computeStr = cmdString;
	}

	// parse brackets:
	var cmd =  parseBrackets( computeStr ).split(""); // and convert string to Array

	// Parse delimiters
	var startdelimiters = ["(","[",",",";"];
	var enddelimiters = [")","]",",",";"];
	var i;
	var j;
	var k;
	var parsedContent = "";
	var parsedCommand = new Array(cmd.length);

	var map = new Array(cmd.length ) ;
	for ( k=0;k<cmd.length;k++) {
		map[k] = k;
		parsedCommand[k] = cmd[k];
	}

	i = cmd.length - 1;
	while ( i >= 0 ) {
		// Find the most right starting delimiter
		while ( i >= 0 && startdelimiters.indexOf(cmd[i]) < 0 )
			i--;
		if ( i >= 0 ) {
			// found a delimiter, search for the closest ending delimiter
			j = i+1;
			while ( j < cmd.length && enddelimiters.indexOf(cmd[j] ) < 0 ) {
				j++;
			}
			if ( j < cmd.length ) {
				// starting delimiter is at cmd[i] and ending one at cmd[j]

				// parse content within delimiters
				parsedContent = parseSplittedCommand( parsedCommand.slice(map[i]+1,map[j]).join("") ) ;
				// and replace the corresponding content in the parsed command
				parsedCommand.splice (map[i]+1, map[j]-map[i]-1, parsedContent ) ;

				// remove delimiters from string to be parsed
				if ( cmd[i] != "," )
					cmd[i] = " ";	// except for commas that serve twice (once as start once as end)
				cmd[j] = " ";

				// map position in the original cmd to positions in the parsedCommand to track brackets
				for ( k=i+1; k < j;k++)
					map[k] = map[i]+1;
				var deltamap = map[j] - map[i] - 1;
				for ( k=j; k < cmd.length;k++)
					map[k] += 1 - deltamap;

				/*console.log(parsedCommand);
				console.log(cmd.join(""));
				console.log(map);
				console.log(i + " : " + j);*/
			}
			else {
				return "undefined";
			}
		}
		i--;
	}
	var FinalCommand = assignmentStr + parseSplittedCommand(parsedCommand.join(""));

	// Parse brackets => get matrix entries
	//cmdString = cmdString.split("][").join(",").split("]").join(")");	// replace ][ by , and ] by )
	// consider [ as a left-hand unary operator
//	cmd = "get(" + parseSplittedCommand(splitted_wrt_op[0]) + ")";



	if ( assignmentStr.substr(0,4) == "set(" )
		FinalCommand  += " )";

	FinalCommand = parseRangeRange(	FinalCommand );

	console.log(FinalCommand);
	return FinalCommand;
}

function parseRangeRange( cmd ) {
	// parse complex ranges like 0:0.1:4
	var elems = cmd.split("range(range(");
	var i;
	var j;
	var tmp;
	var args;
	var incargs;
	var endargs;
	for ( i = 0; i< elems.length - 1 ; i++) {

//		elems[i+1] = elems[i+1].replace(")","");

		// ivert second and third arguments to get range(start, end, inc) from start:inc:end
		args = 	elems[i+1].split(",");
		tmp = args[2].split(")"); // keep only the content of the range and not the remaining commands
		endargs = tmp[0];
		j = 0;	// deal with cases like end="minus(4)" where the first closing bracket is not at the complete end
		while ( tmp[j].indexOf("(") >= 0 ) {
			endargs = endargs + ")" + tmp[j+1];
			j++;
		}

		incargs = args[1].substr(0,args[1].length-1); // remove ")"
		args[1] = endargs;
		//endargs[0] = incargs;
		args[2] = incargs + ")" + tmp.slice(j+1).join(")");
		elems[i+1] = args.join(",");
	}
	return elems.join("range(");//replace range(range( by range(
}

function removeSpaces( str ) {
	return str.split(" ").join("");
}

////////////////////////////
/// Lab
////////////////////////////
function MLlab ( id , path ) {
	var that = new Lalolab ( id, true, path);
	return that;
}
function Lalolab ( id, mllab , path ) {
	// constructor for a Lab with independent scope running in a worker
	this.id = id;

	this.callbacks = new Array();

	// Create worker with a Blob  to avoid distributing lalolibworker.js
	// => does not work due to importScripts with relative path to the Blob unresolved (or cross-origin)

	if ( typeof(path) == "undefined" )
		var path = "http://mlweb.loria.fr/";
	else {
		if (path.length > 0 && path[path.length-1] != "/" )
			path = [path,"/"].join("");
	}

	if ( typeof(mllab) != "undefined" && mllab ) {
		this.worker = new Worker(path+"mlworker.js"); // need mlworker.js in same directory as web page
		this.labtype = "ml";
		/* Using a Blob to avoid distributing mlworker.js:
		 	does not work because of importScripts from cross origin...
		var workerscript = "importScripts(\"ml.js\");\n onmessage = function ( WorkerEvent ) {\n	var WorkerCommand = WorkerEvent.data.cmd;var mustparse = WorkerEvent.data.parse; \n if ( mustparse )\n	var res = lalo(WorkerCommand);\n 	else {\n	if ( WorkerCommand == \"load_mat\" ) {\n	if ( type(WorkerEvent.data.data) == \"matrix\" )\n var res = new Matrix(WorkerEvent.data.data.m,WorkerEvent.data.data.n,WorkerEvent.data.data.val, true);\nelse\n 	var res = mat(WorkerEvent.data.data, true);\n	eval(WorkerEvent.data.varname + \"=res\");\n}\n else\n var res = self.eval( WorkerCommand ) ;\n}\n try {\n	postMessage( { \"cmd\" : WorkerCommand, \"output\" : res } );\n} catch ( e ) {\n try {\n postMessage( { \"cmd\" : WorkerCommand, \"output\" : res.info() } );\n	} catch(e2) { \n postMessage( { \"cmd\" : WorkerCommand, \"output\" : undefined } );\n}\n}\n}";
		var blob = new Blob([workerscript], { "type" : "text/javascript" });
		var blobURL = window.URL.createObjectURL(blob);
		console.log(blobURL);
		this.worker = new Worker(blobURL);*/
	}
	else {
		this.worker = new Worker(path+"lalolibworker.js"); // need lalolibworker.js in same directory as web page
		this.labtype = "lalo";
	}
	this.worker.onmessage = this.onresult;
	this.worker.parent = this;
}
Lalolab.prototype.close = function ( ) {
	this.worker.terminate();
	this.worker.parent = null;// delete circular reference
}
Lalolab.prototype.onprogress = function ( ratio ) {
	// do nothing by default;
	// user must set lab.onprogress = function (ratio) { ... } to do something
}
Lalolab.prototype.onresult = function ( WorkerEvent ) {
//	console.log(WorkerEvent, ""+ this.parent.callbacks);
	if ( typeof(WorkerEvent.data.progress) != "undefined" ) {
		this.parent.onprogress( WorkerEvent.data.progress ) ;
	}
	else {
		var cb =  this.parent.callbacks.splice(0,1)[0] ; // take first callback from the list
		if ( typeof(cb) == "function" ) {
			var WorkerCommand = WorkerEvent.data.cmd;
			var WorkerResult = WorkerEvent.data.output;
			cb(	WorkerResult, WorkerCommand, this.parent.id ); // call the callback if present
		}
	}
}
Lalolab.prototype.do = function ( cmd , callback ) {
	// prepare callback, parse cmd and execute in worker
	this.callbacks.push(  callback  ) ;
	this.worker.postMessage( {cmd: cmd, parse: true} );
}
Lalolab.prototype.exec = function ( cmd , callback ) {
	// prepare callback, and execute cmd in worker
	this.callbacks.push( callback );
	this.worker.postMessage( {cmd: cmd, parse: false} );
}
Lalolab.prototype.parse = function ( cmd , callback ) {
	// prepare callback, parse cmd and execute in worker
	this.callbacks.push( callback );
	this.worker.postMessage( {cmd: cmd, parse: false} );
}
Lalolab.prototype.load = function ( data , varname, callback ) {
	// load data in varname
	this.callbacks.push(  callback  ) ;
	if ( typeof(data) == "string" ){
		this.worker.postMessage( {"cmd" : varname + "= load_data (\"" + data + "\")", parse: false} );
	}
	else {
		this.worker.postMessage( {"cmd" : "load_mat", data: data, varname: varname, parse: false} );
	}
}
Lalolab.prototype.import = function ( script, callback ) {
	// load a script in lalolib language
	this.do('importLaloScript("' + script + '")', callback);
}
function importLaloScript ( script ) {
	// load a script in lalolib language in the current Lab worker
	var xhr = new XMLHttpRequest();
	xhr.open('GET', script, false);
	xhr.send();
	var cmd = xhr.responseText;
 	return lalo(cmd);
}
Lalolab.prototype.importjs = function ( script, callback ) {
	// load a script in javascript
	this.exec("importScripts('" + script + "');", callback);
}
Lalolab.prototype.getObject = function ( varname, callback ) {
	this.exec("getObjectWithoutFunc(" + varname +")", function (res) {callback(renewObject(res));} );
}

function getObjectWithoutFunc( obj ) {
	// Functions and Objects with function members cannot be sent
	// from one worker to another...

	if ( typeof(obj) != "object" )
		return obj;
	else {
		var res = {};

		for (var p in obj ) {
			switch( type(obj[p]) ) {
			case "vector":
				res[p] = {type: "vector", data: [].slice.call(obj[p])};
				break;
			case "matrix":
				res[p] = obj[p];
				res[p].val = [].slice.call(obj[p].val);
				break;
			case "spvector":
				res[p] = obj[p];
				res[p].val = [].slice.call(obj[p].val);
				res[p].ind = [].slice.call(obj[p].ind);
				break;
			case "spmatrix":
				res[p] = obj[p];
				res[p].val = [].slice.call(obj[p].val);
				res[p].cols = [].slice.call(obj[p].cols);
				res[p].rows = [].slice.call(obj[p].rows);
				break;
			case "undefined":
				res[p] = obj[p];
				break;
			case "function":
				break;
			case "Array":
				res[p] = getObjectWithoutFunc( obj[p] );
				res[p].type = "Array";
				res[p].length = obj[p].length;
				break;
			default:
				res[p] = getObjectWithoutFunc( obj[p] );
				break;
			}
		}
		return res;
	}
}
function renewObject( obj ) {
	// Recreate full object with member functions
	// from an object created by getObjectWithoutFunc()

	var to = type(obj);
	switch( to ) {
		case "number":
		case "boolean":
		case "string":
		case "undefined":
			return obj;
			break;
		case "vector":
			return new Float64Array(obj.data);
			break;
		case "matrix":
			return new Matrix(obj.m, obj.n, obj.val);
			break;
		case "spvector":
			return new spVector(obj.length,obj.val,obj.ind);
			break;
		case "spmatrix":
			return new spMatrix(obj.m, obj.n, obj.val, obj.cols, obj.rows);
			break;
		case "object":
			// Object without type property and thus without Class
			var newobj = {};
			for ( var p in obj )
				newobj[p] = renewObject(obj[p]);
			return newobj;
			break;
		case "Array":
			var newobj = new Array(obj.length);
			for ( var p in obj )
				newobj[p] = renewObject(obj[p]);
			return newobj;
		default:
			// Structured Object like Classifier etc...
			// type = Class:subclass
			var typearray = obj.type.split(":");
			var Class = eval(typearray[0]);
			if ( typearray.length == 1 )
				var newobj = new Class();
			else
				var newobj = new Class(typearray[1]);
			for ( var p in obj )
				newobj[p] = renewObject(obj[p]);

			// deal with particular cases:
			// Rebuild kernelFunc
			if (typearray[1] == "SVM" || typearray[1] == "SVR" ) {
				newobj["kernelFunc"] = kernelFunction(newobj["kernel"], newobj["kernelpar"], type(newobj["SV"]) == "spmatrix"?"spvector":"vector");
			}
			if (typearray[1] == "KernelRidgeRegression" ) {
				newobj["kernelFunc"] = kernelFunction(newobj["kernel"], newobj["kernelpar"], type(newobj["X"]) == "spmatrix"?"spvector":"vector");
			}

			return newobj;
			break;
	}
}

function load_data ( datastring ) {

	// convert a string into a matrix data
	var i;
	var cmd = "mat( [ ";
	var row;
	var rows = datastring.split("\n");
	var ri ;
	for ( i=0; i< rows.length - 1; i++) {
		ri = removeFirstSpaces(rows[i]);
		if ( ri != "" ) {
			row = ri.replace(/,/g," ").replace(/ +/g,",");
			cmd += "new Float64Array([" + row + "]) ,";
		}
	}
	ri = removeFirstSpaces(rows[rows.length-1]);
	if ( ri != "" ) {
		row = ri.replace(/,/g," ").replace(/ +/g,",");
		cmd += "new Float64Array([" + row + "]) ] , true) ";
	}
	else {
		cmd = cmd.substr(0,cmd.length-1); // remove last comma
		cmd += "] , true) ";
	}

	return eval(cmd);

}

function removeFirstSpaces( str ) {
	//remove spaces at begining of string
	var i = 0;
	while ( i < str.length && str[i] == " " )
		i++;
	if ( i<str.length ) {
		// first non-space char at i
		return str.slice(i);
	}
	else
		return "";
}

//// progress /////////////////////
function notifyProgress( ratio ) {
	postMessage( { "progress" : ratio } );
	console.log("progress: " + ratio);
}



//////////////////////////
//// CONSTANTS and general tools
///////////////////////////
var LALOLIB_ERROR = "";

const EPS = 2.2205e-16;

function isZero(x) {
	return (Math.abs(x) < EPS ) ;
}
function isInteger(x) {
	return (Math.floor(x) == x ) ;
}

function tic( T ) {
	if ( typeof(TICTOCstartTime) == "undefined" )
		TICTOCstartTime = new Array();
	if (typeof(T) == "undefined")
		var T = 0;
	TICTOCstartTime[T] = new Date();
}
function toc ( T ) {
	if ( typeof(T) == "undefined" )
		var T = 0;
	if ( typeof(TICTOCstartTime) != "undefined" && typeof(TICTOCstartTime[T]) != "undefined" ) {
		// Computing time
		var startTime = TICTOCstartTime[T];
		var endTime = new Date();
		var time = ( endTime - startTime) / 1000;  // in seconds
		return time;
	}
	else
		return undefined;
}
/**
 * @return {string}
 */
function type( X ) {
	if ( X == null )
		return "undefined";
	else if ( X.type )
 		return X.type;
 	else {
	 	var t = typeof( X );
		if ( t == "object") {
			if ( Array.isArray(X) ) {
				if ( isArrayOfNumbers(X) )
			 		return "vector";	// for array vectors created by hand
			 	else
			 		return "Array";
			}
			else if ( X.buffer )
		 		return "vector"; // Float64Array vector
		 	else
		 		return t;
		}
		else
			return t;
	}
}
/**
 * @param {Array}
 * @return {boolean}
 */
function isArrayOfNumbers( A ) {
	for (var i=0; i < A.length; i++)
		if ( typeof(A[i]) != "number" )
			return false;
	return true;
}
function isScalar( x ) {
	switch( typeof( x ) ) {
		case "string":
		case "number":
		case "boolean":
			return true;
			break;
		default:
			if (type(x) == "Complex")
				return true;
			else
				return false;
			break;
	}
}

/**
 * @param {Float64Array}
 * @return {string}
 */
function printVector( x ) {
	const n = x.length;
	var str = "[ ";
	var i = 0;
	while ( i < n-1 && i < 5 ) {
		str += (isInteger( x[i] ) ? x[i] : x[i].toFixed(3) ) + "; ";
		i++;
	}
	if ( i == n-1 )
		str += (isInteger( x[i] ) ? x[i] : x[i].toFixed(3) ) + " ]" ;
	else
		str += "... ] (length = " + n + ")";

	return str;
}


//////////////////////////////
// Matrix/vector creation
//////////////////////////////
/**
 * @constructor
 * @struct
 */
function Matrix(m,n, values) {

	/** @const */ this.length = m;
	/** @const */ this.m = m;
	/** @const */ this.n = n;
	/** @const */ this.size = [m,n];
	/** @const */ this.type = "matrix";

	if ( arguments.length == 2)
		this.val = new Float64Array( m * n ); // simple m x n zeros
	else if (arguments.length == 3)
		this.val = new Float64Array( values ); // m x n filled with values with copy
	else if (arguments.length == 4)
		this.val =  values ; // m x n filled with values without copy
}

Matrix.prototype.get = function ( i,j) {
	return this.val[i*this.n + j];
}
Matrix.prototype.set = function ( i,j, v) {
	this.val[i*this.n + j] = v;
}
/**
 * return a pointer-like object on a row in a matrix, not a copy!
 * @param {number}
 * @return {Float64Array}
 */
Matrix.prototype.row = function ( i ) {
	return this.val.subarray(i*this.n, (i+1)*this.n);
}

/**
 * return a copy of the matrix as an Array of Arrays
 * (do not do this with too many rows...)
 * @return {Array}
 */
Matrix.prototype.toArray = function ( ) {
	var A = new Array(this.m);
	var ri = 0;
	for ( var i=0; i < this.m; i++) {
		A[i] = new Array(this.n);
		for ( var j=0; j < this.n; j++)
			A[i][j] = this.val[ri + j];
		ri += this.n;
	}
	return A;
}
/**
 * return a view (not a copy) on the matrix as an Array of Float64Array
 * (do not do this with too many rows...)
 * @return {Array}
 */
Matrix.prototype.toArrayOfFloat64Array = function ( ) {
	var A = new Array(this.m);
	for ( var i=0; i < this.m; i++)
		A[i] = this.val.subarray(i*this.n, (i+1)*this.n);

	return A;
}

function array2mat( A ) {
	return mat(A, true);
}
function array2vec( a ) {
	return vectorCopy(a);
}
function vec2array( a ) {
	return Array.apply([], a);
}


function size( A, sizealongdimension ) {
	var s;
	switch( type(A) ) {
	case "string":
	case "boolean":
	case "number":
	case "Complex":
		s = [1,1];
		break;
	case "vector":
	case "spvector":
	case "ComplexVector":
		s = [A.length, 1];
		break;
	case "matrix":
	case "spmatrix":
	case "ComplexMatrix":
		s = A.size;
		break;
	case "object":
		s = [1,1];
		break;
	default:
		s = [1,1];
		//error( "Cannot determine size of object" );
		break;
	}

	if ( typeof(sizealongdimension) == "undefined" )
		return s;
	else
		return s[sizealongdimension-1];

}

function ones(rows, cols) {
	// Create a matrix or vector full of ONES
	if ( arguments.length == 1 || cols == 1 ) {
		var v = new Float64Array(rows);
		for (var i = 0; i< rows; i++)
			v[i] = 1;
		return v;
	}
	else {
		var M = new Matrix(rows, cols);
		const mn = rows*cols;
		for (var i = 0; i< mn; i++) {
			M.val[i] = 1;
		}
		return M;
	}
}
// Use zeros( m, n)
function zeros(rows, cols) {
	// Create a matrix or vector of ZERO
	if ( arguments.length == 1 || cols == 1 ) {
		return new Float64Array(rows);
	}
	else {
		return new Matrix(rows, cols);
	}
}

function eye(m,n) {
	if ( typeof(n) == "undefined")
		var n = m;
	if ( m == 1 && n == 1)
		return 1;

	var I = zeros(m,n);
	const e = (m<n)?m:n;
	for ( var i = 0; i< e; i ++) {
		I.val[i*(n+1)] = 1;
	}

	return I;
}

function diag( A ) {
	var i;
	var typeA = type(A);
	if (typeA == "vector" ) {
		var M = zeros(A.length,A.length);
		var j = 0;
		const stride = A.length+1;
		for ( i=0; i < A.length; i++) {
				M.val[j] = A[i];
				j += stride;
		}
		return M;
	}
	else if ( typeA =="matrix") {
		var n = Math.min(A.m, A.n);
		var v = new Float64Array(n);
		var j = 0;
		const stride2 = A.n+1;
		for ( i =0; i< n;i++) {
			v[i] = A.val[j];
			j+=stride2;
		}
		return v;
	}
	else if (typeA == "ComplexVector" ) {
		var M = new ComplexMatrix(A.length,A.length);
		var j = 0;
		const stride = A.length+1;
		for ( i=0; i < A.length; i++) {
				M.re[j] = A.re[i];
				M.im[j] = A.im[i];
				j += stride;
		}
		return M;
	}
	else if ( typeA == "ComplexMatrix") {
		var n = Math.min(A.m, A.n);
		var v = new ComplexVector(n);
		var j = 0;
		const stride2 = A.n+1;
		for ( i =0; i< n;i++) {
			v.re[i] = A.re[j];
			v.im[i] = A.im[j];
			j+=stride2;
		}
		return v;
	}
}

/**
 * @param {Matrix}
 * @return {Float64Array}
 */
function vec( A ) {
	return new Float64Array(A.val);
}

function matrixCopy( A ) {
	var t = type(A) ;
	switch(t) {
	case "vector":
		return vectorCopy(A);
		break;
	case "ComplexVector":
		return new ComplexVector(A);
		break;
	case "matrix":
		return new Matrix(A.m, A.n, A.val);
		break;
	case "ComplexMatrix":
		return new ComplexMatrix(A);
		break;
	case "Array":
		return arrayCopy ( A ) ;
		break;
	case "spvector":
	case "spmatrix":
		return A.copy();
		break;
	default:
		error("Error in matrixCopy(A): A is not a matrix nor a vector.");
		return undefined;
		break;
	}
}
/**
 * @param {Float64Array}
 * @return {Float64Array}
 */
function vectorCopy( a ) {
	return new Float64Array( a );
}
/** Vector copy into another existing vector ( y = x )
 * (saves memory allocation)
 * @param {Float64Array}
 * @param {Float64Array}
 */
function vectorCopyInto (x, y) {
	y.set(x);
}

/**
 * @param {Array}
 * @return {Array}
 */
function arrayCopy( A ) {
	var res = new Array(A.length);
	for ( var i = 0; i < A.length; i++ )
		if ( isScalar(A[i]) )
			res[i] = A[i];	//does not copy 2D Arrays...
		else
			res[i] = matrixCopy( A[i] ) ;
	return res;
}

/**
 * Return enlarged matrix with one more row of zeros
 * NOTE: both matrices share the same storage and should not be used independently
 * so better use: A = appendRow(A); or just appendRow(A);
 * @param{Matrix}
 * @return{Matrix}
 */
function appendRow ( A ) {
	var Aa = zeros(A.m+1,A.n);
	Aa.val.set(A.val);
	return Aa;
}

/**
 * Reshape the dimensions of a vector/matrix
 * @param{{Float64Array|Matrix}}
 * @param{number}
 * @param{number}
 * @return{{Float64Array|Matrix}}
 */
function reshape ( A, m, n ) {
	var R = undefined;
	var tA = type( A );
	if ( tA == "vector" ) {
		if ( m*n != A.length ) {
			error("Error in reshape(a,m,n): a.length = " + A.length + " != m*n");
		}
		else {
			R = new Matrix(m,n,A);
		}
	}
	else if ( tA == "matrix" ) {
		if ( m*n != A.m*A.n ) {
			error("Error in reshape(A,m,n): A.m * A.n = " + A.m*A.n + " != m*n");
		}
		else {
			if ( n == 1 )
				R = vectorCopy(A.val);
			else
				R = new Matrix(m,n,A.val);
		}
	}
	else
		error("Error in reshape(A): A is neither a vector nor a matrix.");
	return R;
}



////////////////////////
// slicing functions
////////////////////////

/*
	GET function : returns a copy of a subset of entries

	For MATRICES:

	get ( M, rows, cols ) => submatrix of M
	get ( M, rows ) 	  => subset of rows from M (equiv to rows(M,rows) )
	get ( M, [], cols )   => subset of cols (equiv to cols(M, cols) )
	get ( M, i, j)		  => M[i][j] converted to dense format (0 instead of undefined)
	get ( M ) 			  => M in dense format  (with 0 instead of undefined)

	For VECTORS:

	get ( v, rows ) 	  => subvector from v (equiv to rows(v,rows) )
	get ( v, i )		  => v[i] converted to dense format (0 instead of undefined)
	get ( v ) 			  => v in dense format  (with 0 instead of undefined)

*/
function get ( A , rowsrange, colsrange) {

	var typerows = typeof(rowsrange);
	var typecols = typeof(colsrange);

	if (arguments.length == 1 )
		return matrixCopy(A);

	var typeA = type ( A );
	if ( typeA == "vector" ) {

		if ( typerows == "number" ) {
			if (rowsrange >= 0 && rowsrange < A.length)
				return A[rowsrange];	// get v[i]
			else {
				error("Error in a[i] = get(a,i): Index i="+rowsrange+" out of bounds [0,"+(A.length-1)+"]");
				return undefined;
			}
		}
		else {
			return getSubVector(A, rowsrange);
		}
	}
	else if ( typeA == "matrix") {

		if ( typerows == "number" )
			rowsrange = [rowsrange];

		if ( typecols == "number" )
			colsrange = [colsrange];

		if ( rowsrange.length == 1 && colsrange.length == 1 )
			return A.val[rowsrange[0] * A.n + colsrange[0]];	// get ( A, i, j)

		if ( rowsrange.length == 0 )
			return getCols(A,colsrange);// get(A,[],4) <=> cols(A,4)

		if (colsrange.length == 0 )
			return getRows(A, rowsrange);// get(A,3,[]) <=> rows(A,3)

		// otherwise:
		return getSubMatrix(A, rowsrange, colsrange);

	}
	else if ( typeA == "Array" ) {
		if ( typerows == "number" )
			return A[rowsrange];
		else
			return getSubArray(A, rowsrange);
	}
	else if ( typeA == "spmatrix") {

		if ( typerows == "number" )
			rowsrange = [rowsrange];

		if ( typecols == "number" )
			colsrange = [colsrange];

		if ( rowsrange.length == 1 && colsrange.length == 1 )
			return A.get(rowsrange[0], colsrange[0]);   // get ( A, i, j)

		if ( rowsrange.length == 1 && A.rowmajor )
			return A.row(rowsrange[0]);
		if ( colsrange.length == 1 && !A.rowmajor )
			return A.col(colsrange[0]);

		if (colsrange.length == 0 )
			return spgetRows(A, rowsrange);
		if ( rowsrange.length == 0 )
			return spgetCols(A,colsrange);

		// TODO
	}
	else if ( typeA == "spvector" ) {

		if ( typerows == "number" )
			return A.get( rowsrange );	// get v[i]
		else
			return getSubspVector(A, rowsrange);//TODO
	}
	else if ( typeA == "ComplexVector") {
		if ( typerows == "number" )
			return A.get( rowsrange );	// get v[i]
		else
			return A.getSubVector(rowsrange);
	}
	else if ( typeA == "ComplexMatrix") {

		if ( typerows == "number" )
			rowsrange = [rowsrange];

		if ( typecols == "number" )
			colsrange = [colsrange];

		if ( rowsrange.length == 1 && colsrange.length == 1 )
			return A.get(i,j);

		if ( rowsrange.length == 0 )
			return A.getCols(colsrange);// get(A,[],4) <=> cols(A,4)

		if (colsrange.length == 0 )
			return A.getRows(rowsrange);// get(A,3,[]) <=> rows(A,3)

		// otherwise:
		return A.getSubMatrix(rowsrange, colsrange);
	}
	return undefined;
}
function getSubMatrix(A, rowsrange, colsrange) {
	var n = colsrange.length;
	var i;
	var j;
	var res;
	if ( n == 1 ) {
		 res = new Float64Array(rowsrange.length);
		 for (i= 0; i< rowsrange.length ; i++) {
		 	res[i] = A.val[rowsrange[i] * A.n + colsrange[0]];
		 }
	}
	else {
		res = new Matrix(rowsrange.length, n);
		var r = 0;

		for (i= 0; i< rowsrange.length ; i++) {
			var rA = rowsrange[i]*A.n;
			for ( j=0; j < n; j++) {
				res.val[r+j] = A.val[rA + colsrange[j]];
			}
			r += n;
		}
	}
	return res;
}

function getRows(A, rowsrange) {
	var n = rowsrange.length;
	if ( n > 1 ) {
		var res = new Matrix(n, A.n);
		var r=0;
		for ( var i = 0; i < n; i++) {
			for (var j=0; j < A.n; j++)
				res.val[r + j] = A.val[rowsrange[i]*A.n + j];
			r += A.n;
		}
		return res;
	}
	else
		return vectorCopy(A.val.subarray( rowsrange[0]*A.n, rowsrange[0]*A.n + A.n));
}
function getCols(A, colsrange) {
	var m = A.m;
	var n = colsrange.length;
	if( n > 1 ) {
		var res = new Matrix(m, n);
		var r = 0;
		var rA = 0;
		for ( var i = 0; i < m; i++) {
			for ( var j = 0; j < n; j++)
				res.val[r + j] = A.val[rA + colsrange[j]];

			r += n;
			rA += A.n;
		}
		return res;
	}
	else {
		var res = new Float64Array(m);
		var r = 0;
		for ( var i = 0; i < m; i++) {
			res[i] = A.val[r + colsrange[0]];
			r += A.n;
		}
		return res;
	}
}
/**
 * @param {Float64Array}
 * @param {Array}
 * @return {Float64Array}
 */
function getSubVector(a, rowsrange) {
	const n = rowsrange.length;
	var res= new Float64Array( n );
	for (var i = 0; i< n; i++) {
		res[i] = a[rowsrange[i]];
	}
	return res;
}

/**
 * @param {Array}
 * @param {Array}
 * @return {Array}
 */
function getSubArray(a, rowsrange) {
	const n = rowsrange.length;
	var res= new Array( n );
	for (var i = 0; i< n; i++) {
		res[i] = a[rowsrange[i]];
	}
	return res;
}


function getrowref(A, i) {
	// return a pointer-like object on a row in a matrix, not a copy!
	return A.val.subarray(i*A.n, (i+1)*A.n);
}

/*
	SET function : set values in a subset of entries of a matrix or vector

	For MATRICES:

	set ( M, rows, cols, A ) => submatrix of M = A
	set ( M, rows, A ) 	     => subset of rows from M = A
	set ( M, [], cols, A )   => subset of cols from M = A
	set ( M, i, [], A )   	 => fill row M[i] with vector A (transposed)
	set ( M, i, j, A)	     => M[i][j] = A

	For VECTORS:

	set ( v, rows, a ) 	  => subvector from v = a
	set ( v, i , a)		  => v[i] = a

*/
function set ( A , rowsrange, colsrange, B) {
	var i;
	var j;
	var k;
	var l;
	var n;

	var typerows = typeof(rowsrange);
	var typecols = typeof(colsrange);

	if (arguments.length == 1 )
		return undefined;

	var typeA = type ( A );
	if ( typeA == "vector" ) {
		B = colsrange;
		if ( typerows == "number" ) {
			A[rowsrange] = B;
			return B;
		}
		else if ( rowsrange.length == 0 )
			rowsrange = range(A.length);

		if ( size(B,1) == 1 ) {
			setVectorScalar (A, rowsrange, B);
		}
		else {
			setVectorVector (A, rowsrange, B);
		}
		return B;
	}
	else if ( typeA == "matrix") {

		if ( typerows == "number" )
			rowsrange = [rowsrange];
		if ( typecols == "number" )
			colsrange = [colsrange];

		if ( rowsrange.length == 1 && colsrange.length == 1 ) {
			A.val[rowsrange[0]*A.n + colsrange[0]] = B;
			return B;
		}

		if ( rowsrange.length == 0 ) {
			setCols(A, colsrange, B);
			return B;
		}

		if (colsrange.length == 0 ) {
			setRows( A, rowsrange, B);
			return B;
		}

		// Set a submatrix
		var sB = size(B);
		var tB = type(B);
		if ( sB[0] == 1 && sB[1] == 1 ) {
			if ( tB == "number" )
				setMatrixScalar(A, rowsrange, colsrange, B);
			else if ( tB == "vector" )
				setMatrixScalar(A, rowsrange, colsrange, B[0]);
			else
				setMatrixScalar(A, rowsrange, colsrange, B.val[0]);
		}
		else {
			if ( colsrange.length == 1 )
				setMatrixColVector(A, rowsrange, colsrange[0], B);
			else if ( rowsrange.length == 1 ) {
				if ( tB == "vector" )
					setMatrixRowVector(A, rowsrange[0], colsrange, B);
				else
					setMatrixRowVector(A, rowsrange[0], colsrange, B.val);
			}
			else
				setMatrixMatrix(A, rowsrange, colsrange, B);
		}
		return B;
	}
	else if ( typeA == "ComplexVector" ) {
		B = colsrange;
		if ( typerows == "number" ) {
			A.set(rowsrange, B);
			return B;
		}
		else if ( rowsrange.length == 0 )
			rowsrange = range(A.length);

		if ( size(B,1) == 1 ) {
			A.setVectorScalar (rowsrange, B);
		}
		else {
			A.setVectorVector (rowsrange, B);
		}
		return B;
	}
}

function setVectorScalar(A, rowsrange, B) {
	var i;
	for (i = 0; i< rowsrange.length; i++)
		A[rowsrange[i]] = B;
}
function setVectorVector(A, rowsrange, B) {
	var i;
	for (i = 0; i< rowsrange.length; i++)
		A[rowsrange[i]] = B[i];
}

function setMatrixScalar(A, rowsrange, colsrange, B) {
	var i;
	var j;
	var m = rowsrange.length;
	var n = colsrange.length;
	for (i = 0; i< m; i++)
		for(j=0; j < n; j++)
			A.val[rowsrange[i]*A.n + colsrange[j]] = B;
}
function setMatrixMatrix(A, rowsrange, colsrange, B) {
	var i;
	var j;
	var m = rowsrange.length;
	var n = colsrange.length;
	for (i = 0; i< m; i++)
		for(j=0; j < n; j++)
			A.val[rowsrange[i]*A.n + colsrange[j]] = B.val[i*B.n +j];
}
function setMatrixColVector(A, rowsrange, col, B) {
	var i;
	var m = rowsrange.length;
	for (i = 0; i< m; i++)
		A.val[rowsrange[i]*A.n + col] = B[i];
}
function setMatrixRowVector(A, row, colsrange, B) {
	var j;
	var n = colsrange.length;
	for(j=0; j < n; j++)
		A.val[row*A.n + colsrange[j]] = B[j];
}
function setRows(A, rowsrange, B ) {
	var i;
	var j;
	var m = rowsrange.length;
	var rA;
	switch( type(B) ) {
	case "vector":
		for ( i=0; i<m; i++) {
			rA = rowsrange[i]*A.n;
			for ( j=0; j<B.length; j++)
				A.val[rA + j] = B[j];
		}
		break;
	case "matrix":
		var rB = 0;
		for ( i=0; i<m; i++) {
			rA = rowsrange[i]*A.n;
			for ( j=0; j < B.n; j++)
				A.val[rA + j] = B.val[rB + j];
			rB += B.n;
		}
		break;
	default:
		for ( i=0; i<m; i++) {
			rA = rowsrange[i] * A.n;
			for(j=0; j < A.n; j++)
				A.val[rA + j] = B;
		}
		break;
	}
}
function setCols(A, colsrange, B ) {
	var i;
	var m = A.m;
	var n = colsrange.length;
	var r = 0;
	switch( type(B) ) {
	case "vector":
		for ( i=0; i<m; i++) {
			for (j=0; j < n; j++)
				A.val[r + colsrange[j]] = B[i];
			r += A.n;
		}
		break;
	case "matrix":
		for ( i=0; i<m; i++) {
			for (j=0; j < n; j++)
				A.val[r + colsrange[j]] = B.val[i* B.n + j];
			r += A.n;
		}
		break;
	default:
		for ( i=0; i<m; i++) {
			for(j=0; j < n; j++)
				A.val[r + colsrange[j]] = B;
			r += A.n;
		}
		break;
	}
}

function dense ( A ) {
	return A;
}

// Support
function supp( x ) {
	const tx = type (x);
	if ( tx == "vector" ) {
		var indexes = [];
		var i;
		for ( i = 0; i < x.length;  i++ ) {
			if ( !isZero(x[i]) )
				indexes.push(i);
		}

		return indexes;
	}
	else if (tx == "spvector" ) {
		return new Float64Array(x.ind);
	}
	else
		return undefined;
}

// Range
function range(start, end, inc) {
	// python-like range function
	// returns [0,... , end-1]
	if ( typeof(start) == "undefined" )
		return [];

	if ( typeof(inc) == "undefined" )
		var inc = 1;
	if ( typeof(end) == "undefined" ) {
		var end = start;
		start = 0;
	}

	if ( start == end-inc) {
		return start;
	}
	else if ( start == end) {
		return [];
	}
	else if ( start > end ) {
		if ( inc > 0)
			inc *= -1;
		var r = new Array( Math.floor ( ( start - end ) / Math.abs(inc) ) );
		var k = 0;
		for ( var i = start; i> end; i+=inc) {
			r[k] = i;
			k++;
		}
	}
	else {
		var r = new Array( Math.floor ( ( end - start ) / inc ) );
		var k = 0;
		for ( var i = start; i< end; i+=inc) {
			r[k] = i;
			k++;
		}
	}
	return r;
}

// Swaping
/**
 * @param {Matrix}
 */
function swaprows ( A , i, j ) {
	if ( i != j ) {
		var ri = i*A.n;
		var rj = j*A.n;
		var tmp = vectorCopy(A.val.subarray(ri, ri+A.n));
		A.val.set(vectorCopy(A.val.subarray(rj, rj+A.n)), ri);
		A.val.set(tmp, rj);
	}
}
/**
 * @param {Matrix}
 */
function swapcols ( A , j, k ) {
	if ( j != k ) {
		var tmp = getCols ( A, [j]);
		setCols ( A, [j] , getCols ( A, [k]) );
		setCols ( A, [k], tmp);
	}
}

//////////////////////////
// Random numbers
////////////////////////////

// Gaussian random number (mean = 0, variance = 1;
//	Gaussian noise with the polar form of the Box-Muller transformation
function randnScalar() {

    var x1;
    var x2;
    var w;
    var y1;
    var y2;
 	do {
	     x1 = 2.0 * Math.random() - 1.0;
	     x2 = 2.0 * Math.random() - 1.0;
	     w = x1 * x1 + x2 * x2;
	 } while ( w >= 1.0 );

	 w = Math.sqrt( (-2.0 * Math.log( w ) ) / w );
	 y1 = x1 * w;
	 y2 = x2 * w;

	 return y1;
}
function randn( dim1, dim2 ) {
    var res;

	if ( typeof ( dim1 ) == "undefined" || (dim1 == 1 && typeof(dim2)=="undefined") || (dim1 == 1 && dim2==1)) {
		return randnScalar();
	}
	else if (typeof(dim2) == "undefined" || dim2 == 1 ) {
		res = new Float64Array(dim1);
		for (var i=0; i< dim1; i++)
			res[i] = randnScalar();

		return res;
	}
	else  {
		res = zeros(dim1, dim2);
		for (var i=0; i< dim1*dim2; i++) {
			res.val[i] = randnScalar();
		}
		return res;
	}
}

// Uniform random numbers
/*
 * @param{number}
 * @return{Float64Array}
 */
function randVector(dim1) {
	var res = new Float64Array(dim1);
	for (var i=0; i< dim1; i++) {
		res[i] = Math.random();
	}
	return res;
}
/*
 * @param{number}
 * @param{number}
 * @return{Matrix}
 */
function randMatrix(dim1,dim2) {
	const n = dim1*dim2;
	var res = new Float64Array(n);
	for (var i=0; i< n; i++) {
		res[i] = Math.random();
	}
	return new Matrix(dim1,dim2,res,true);
}
function rand( dim1, dim2 ) {
	var res;
	if ( typeof ( dim1 ) == "undefined" || (dim1 == 1 && typeof(dim2)=="undefined") || (dim1 == 1 && dim2==1)) {
		 return Math.random();
	}
	else if (typeof(dim2) == "undefined" || dim2 == 1) {
		return randVector(dim1);
	}
	else  {
		return randMatrix(dim1,dim2);
	}
}

function randnsparse(NZratio, dim1, dim2) {
	// Generates a sparse random matrix with NZratio * dim1*dim2 (or NZ if NZratio > 1 ) nonzeros
	var NZ;
	if ( NZratio > 1 )
		NZ = NZratio;
	else
		NZ = Math.floor(NZratio *dim1*dim2);

	var indexes;
	var i;
	var j;
	var k;
	var res;

	if ( typeof ( dim1 ) == "undefined" ) {
		return randn();
	}
	else if (typeof(dim2) == "undefined" || dim2 == 1) {

		indexes = randperm( dim1 );

		res = zeros(dim1);
		for (i=0; i< NZ; i++) {
			res[indexes[i]] = randn();
		}
		return res;
	}
	else  {
		res = zeros(dim1, dim2);
		indexes = randperm( dim1*dim2 );
		for (k=0; k< NZ; k++) {
			i = Math.floor(indexes[k] / dim2);
			j = indexes[k] - i * dim2;
			res.val[i*dim2+j] = randn();
		}
		return res;
	}
}
function randsparse(NZratio, dim1, dim2) {
	// Generates a sparse random matrix with NZratio * dim1*dim2 (or NZ if NZratio > 1 ) nonzeros
	if (typeof(dim2) == "undefined")
		var dim2 = 1;

	var NZ;
	if ( NZratio > 1 )
		NZ = NZratio;
	else
		NZ = Math.floor(NZratio *dim1*dim2);

	var indexes;
	var i;
	var j;
	var k;
	var res;

	if ( typeof ( dim1 ) == "undefined" ) {
		return randn();
	}
	else if (dim2 == 1) {

		indexes = randperm( dim1 );

		res = zeros(dim1);
		for (i=0; i< NZ; i++) {
			res[indexes[i]] = Math.random();
		}
		return res;
	}
	else  {
		res = zeros(dim1, dim2);
		indexes = randperm( dim1*dim2 );

		for (k=0; k< NZ; k++) {
			i = Math.floor(indexes[k] / dim2);
			j = indexes[k] - i * dim2;
			res.val[i*dim2+j] = Math.random();
		}
		return res;
	}
}

function randperm( x ) {
	// return a random permutation of x (or of range(x) if x is a number)

	if ( typeof( x ) == "number" ) {
		var perm = range(x);
	}
	else {
		var perm = new Float64Array(x);
	}
	var i;
	var j;
	var k;

	// shuffle
	for(i=perm.length - 1 ; i > 1; i--) {
		j = Math.floor(Math.random() * i);
		k = perm[j];
		perm[j] = perm[i];
		perm[i] = k;
	}
	return perm;
}
///////////////////////////////
/// Basic Math function: give access to Math.* JS functions
///  and vectorize them
///////////////////////////////


// automatically generate (vectorized) wrappers for Math functions
var MathFunctions = Object.getOwnPropertyNames(Math);
for ( var mf in MathFunctions ) {
	if ( eval( "typeof(Math." + MathFunctions[mf] + ")") == "function") {
		if ( eval( "Math." + MathFunctions[mf] + ".length") == 1 ) {
			// this is a function of a scalar
			// make generic function:
			eval( MathFunctions[mf] + " = function (x) { return apply(Math."+ MathFunctions[mf] + " , x );};");
			// make vectorized version:
			eval( MathFunctions[mf] + "Vector = function (x) { return applyVector(Math."+ MathFunctions[mf] + " , x );};");
			// make matrixized version:
			eval( MathFunctions[mf] + "Matrix = function (x) { return applyMatrix(Math."+ MathFunctions[mf] + " , x );};");
		}
	}
	else if (  eval( "typeof(Math." + MathFunctions[mf] + ")") == "number") {
		// Math constant:
		eval( MathFunctions[mf] + " = Math."+ MathFunctions[mf] ) ;
	}
}

function apply( f, x ) {
	// Generic wrapper to apply scalar functions
	// element-wise to vectors and matrices
	if ( typeof(f) != "function")
		return undefined;
	switch ( type( x ) ) {
	case "number":
		return f(x);
		break;
	case "Complex":
		var ComplexFunctions = ["exp", "abs"];
		var fc = ComplexFunctions.indexOf(f.name);
		if ( fc >= 0 )
			return eval(ComplexFunctions[fc] + "Complex(x);");
		else {
			error("This function has no Complex counterpart (yet).");
			return undefined;
		}
		break;
	case "vector":
		return applyVector(f, x);
		break;
	case "spvector":
		return applyspVector(f, x);
		break;
	case "ComplexVector":
		if ( f.name == "abs" )
			return absComplex(x);
		else
			return applyComplexVector(f, x);
		break;
	case "matrix":
		return applyMatrix(f, x);
		break;
	case "spmatrix":
		return applyspMatrix(f, x);
		break;
	case "ComplexMatrix":
		if ( f.name == "abs" )
			return absComplex(x);
		else
			return applyComplexMatrix(f, x);
		break;
	default:
		return "undefined";
	}
}
function applyVector( f, x ) {
	const nv = x.length;
	var res = new Float64Array(nv);
	for (var i=0; i< nv; i++)
		res[i] = f(x[i]);
	return res;
}
function applyComplexVector( f, x ) {
	const nv = x.length;
	var res = new ComplexVector(nv);
	for (var i=0; i< nv; i++)
		res.set(i, f(x.get(i) ) );
	return res;
}
function applyComplexMatrix( f, x ) {
	const m = x.m;
	const n = x.n;
	var res = new ComplexMatrix(m, n);
	for (var i=0; i< m; i++)
		for ( var j =0; j < n; j++)
			res.set(i, j, f(x.get(i,j) ) );
	return res;
}
function applyMatrix(f, x) {
	return new Matrix(x.m, x.n, applyVector(f, x.val), true);
}
///////////////////////////////
/// Operators
///////////////////////////////

function mul(a,b) {
	var sa = size(a);
	var sb = size(b);
	if ( !isScalar(a) && sa[0] == 1 && sa[1] == 1 )
		a = get(a, 0, 0);
	if ( !isScalar(b) && sb[0] == 1 && sb[1] == 1 )
		b = get(b, 0, 0);

	switch( type(a) ) {
	case "number":
		switch( type(b) ) {
		case "number":
			return a*b;
			break;
		case "Complex":
			return mulComplexReal(b,a);
			break;
		case "vector":
			return mulScalarVector(a,b);
			break;
		case "spvector":
			return mulScalarspVector(a,b);
			break;
		case "ComplexVector":
			return mulScalarComplexVector(a,b);
			break;
		case "matrix":
			return mulScalarMatrix(a,b);
			break;
		case "spmatrix":
			return mulScalarspMatrix(a,b);
			break;
		case "ComplexMatrix":
			return mulScalarComplexMatrix(a,b);
			break;
		default:
			return undefined;
			break;
		}
		break;
	case "Complex":
		switch( type(b) ) {
		case "number":
			return mulComplexReal(a,b);
			break;
		case "Complex":
			return mulComplex(a,b);
			break;
		case "vector":
			return mulComplexVector(a,b);
			break;
		case "ComplexVector":
			return mulComplexComplexVector(a,b);
			break;
		case "spvector":
			return mulComplexspVector(a,b);
			break;
		case "matrix":
			return mulComplexMatrix(a,b);
			break;
		case "ComplexMatrix":
			return mulComplexComplexMatrix(a,b);
			break;
		case "spmatrix":
			return mulComplexspMatrix(a,b);
			break;
		default:
			return undefined;
			break;
		}
		break;
	case "vector":
		switch( type(b) ) {
		case "number":
			return mulScalarVector(b,a);
			break;
		case "Complex":
			return mulComplexVector(b,a);
			break;
		case "vector":
			if ( a.length != b.length ) {
				error("Error in mul(a,b) (dot product): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return dot(a,b);
			break;
		case "spvector":
			if ( a.length != b.length ) {
				error("Error in mul(a,b) (dot product): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return dotspVectorVector(b,a);
			break;
		case "ComplexVector":
			if ( a.length != b.length ) {
				error("Error in mul(a,b) (dot product): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return dotComplexVectorVector(b,a);
			break;
		case "matrix":
			if ( b.m == 1)
				return outerprodVectors(a , b.val );
			else {
				error("Inconsistent dimensions in mul(a,B): size(a) = [" + sa[0] + "," + sa[1] + "], size(B) = [" + sb[0] + "," + sb[1] + "]");
				return undefined;
			}
			break;
		case "spmatrix":
			if ( b.m == 1)
				return outerprodVectors(a , fullMatrix(b).val );
			else {
				error("Inconsistent dimensions in mul(a,B): size(a) = [" + sa[0] + "," + sa[1] + "], size(B) = [" + sb[0] + "," + sb[1] + "]");
				return undefined;
			}
			break;
		case "ComplexMatrix":
			if ( b.m == 1)
				return transpose(outerprodComplexVectorVector(new ComplexVector(b.re,b.im,true), a , b.val ));
			else {
				error("Inconsistent dimensions in mul(a,B): size(a) = [" + sa[0] + "," + sa[1] + "], size(B) = [" + sb[0] + "," + sb[1] + "]");
				return undefined;
			}
			break;
		default:
			return undefined;
			break;
		}
		break;
	case "spvector":
		switch( type(b) ) {
		case "number":
			return mulScalarspVector(b,a);
			break;
		case "vector":
			if ( a.length != b.length ) {
				error("Error in mul(a,b) (dot product): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return dotspVectorVector(a,b);
			break;
		case "spvector":
			if ( a.length != b.length ) {
				error("Error in mul(a,b) (dot product): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return spdot(b,a);
			break;
		case "matrix":
			if ( b.m == 1)
				return outerprodspVectorVector(a , b.val );
			else {
				error("Inconsistent dimensions in mul(a,B): size(a) = [" + sa[0] + "," + sa[1] + "], size(B) = [" + sb[0] + "," + sb[1] + "]");
				return undefined;
			}
			break;
		case "spmatrix":
			if ( b.m == 1)
				return outerprodspVectorVector(a, fullMatrix(b).val);
			else {
				error("Inconsistent dimensions in mul(a,B): size(a) = [" + sa[0] + "," + sa[1] + "], size(B) = [" + sb[0] + "," + sb[1] + "]");
				return undefined;
			}
			break;
		default:
			return undefined;
			break;
		}
		break;
	case "ComplexVector":
		switch( type(b) ) {
		case "number":
			return mulScalarComplexVector(b,a);
			break;
		case "Complex":
			return mulComplexComplexVector(b,a);
			break;
		case "vector":
			if ( a.length != b.length ) {
				error("Error in mul(a,b) (dot product): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return dotComplexVectorVector(a,b);
			break;
		case "spvector":
			if ( a.length != b.length ) {
				error("Error in mul(a,b) (dot product): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return dotComplexVectorspVector(a,b);
			break;
		case "matrix":
			if ( b.m == 1)
				return outerprodComplexVectorVector(a , b.val );
			else {
				error("Inconsistent dimensions in mul(a,B): size(a) = [" + sa[0] + "," + sa[1] + "], size(B) = [" + sb[0] + "," + sb[1] + "]");
				return undefined;
			}
			break;
		case "spmatrix":
			if ( b.m == 1)
				return outerprodComplexVectorVector(a , fullMatrix(b).val );
			else {
				error("Inconsistent dimensions in mul(a,B): size(a) = [" + sa[0] + "," + sa[1] + "], size(B) = [" + sb[0] + "," + sb[1] + "]");
				return undefined;
			}
			break;
		case "ComplexMatrix":
			if ( b.m == 1)
				return outerprodComplexVectors(a , new ComplexVector(b.re,b.im, true) );
			else {
				error("Inconsistent dimensions in mul(a,B): size(a) = [" + sa[0] + "," + sa[1] + "], size(B) = [" + sb[0] + "," + sb[1] + "]");
				return undefined;
			}
			break;
		default:
			return undefined;
			break;
		}
		break;

	case "matrix":
		switch( type(b) ) {
		case "number":
			return mulScalarMatrix(b,a);
			break;
		case "Complex":
			return mulComplexMatrix(b,a);
			break;
		case "vector":
			if ( a.m == 1 ) {
				// dot product with explicit transpose
				if ( a.val.length != b.length ) {
					error("Error in mul(a',b): a.length = " + a.val.length + " != " + b.length + " =  b.length.");
					return undefined;
				}
				return dot(a.val, b);
			}
			else {
				if ( a.n != b.length ) {
					error("Error in mul(A,b): A.n = " + a.n + " != " + b.length + " = b.length.");
					return undefined;
				}
				return mulMatrixVector(a,b);
			}
			break;
		case "spvector":
			if ( a.m == 1 ) {
				// dot product with explicit transpose
				if ( a.val.length != b.length ) {
					error("Error in mul(a',b): a.length = " + a.val.length + " != " + b.length + " =  b.length.");
					return undefined;
				}
				return dotspVectorVector(b, a.val);
			}
			else {
				if ( a.n != b.length ) {
					error("Error in mul(A,b): A.n = " + a.n + " != " + b.length + " = b.length.");
					return undefined;
				}
				return mulMatrixspVector(a,b);
			}
			break;
		case "ComplexVector":
			if ( a.m == 1 ) {
				// dot product with explicit transpose
				if ( a.val.length != b.length ) {
					error("Error in mul(a',b): a.length = " + a.val.length + " != " + b.length + " =  b.length.");
					return undefined;
				}
				return dotComplexVectorVector(b, a.val);
			}
			else {
				if ( a.n != b.length ) {
					error("Error in mul(A,b): A.n = " + a.n + " != " + b.length + " = b.length.");
					return undefined;
				}
				return mulMatrixComplexVector(a,b);
			}
			break;
		case "matrix":
			if ( a.n != b.m ) {
				error("Error in mul(A,B): A.n = " + a.n + " != " + b.m + " = B.m.");
				return undefined;
			}
			return mulMatrixMatrix(a,b);
			break;
		case "spmatrix":
			if ( a.n != b.m ) {
				error("Error in mul(A,B): A.n = " + a.n + " != " + b.m + " = B.m.");
				return undefined;
			}
			return mulMatrixspMatrix(a,b);
			break;
		case "ComplexMatrix":
			if ( a.n != b.m ) {
				error("Error in mul(A,B): A.n = " + a.n + " != " + b.m + " = B.m.");
				return undefined;
			}
			return transpose(mulComplexMatrixMatrix(transpose(b),transpose(a)));
			break;
		default:
			return undefined;
			break;
		}
		break;
	case "spmatrix":
		switch( type(b) ) {
		case "number":
			return mulScalarspMatrix(b,a);
			break;
		case "vector":
			if ( a.m == 1 ) {
				// dot product with explicit transpose
				if ( a.n != b.length ) {
					error("Error in mul(a',b): a.length = " + a.val.length + " != " + b.length + " =  b.length.");
					return undefined;
				}
				return dot(fullMatrix(a).val, b);
			}
			else {
				if ( a.n != b.length ) {
					error("Error in mul(A,b): A.n = " + a.n + " != " + b.length + " = b.length.");
					return undefined;
				}
				return mulspMatrixVector(a,b);
			}
			break;
		case "spvector":
			if ( a.m == 1 ) {
				// dot product with explicit transpose
				if ( a.n != b.length ) {
					error("Error in mul(a',b): a.length = " + a.val.length + " != " + b.length + " =  b.length.");
					return undefined;
				}
				return dotspVectorVector(b, fullMatrix(a).val);
			}
			else {
				if ( a.n != b.length ) {
					error("Error in mul(A,b): A.n = " + a.n + " != " + b.length + " = b.length.");
					return undefined;
				}
				return mulspMatrixspVector(a,b);
			}
			break;
		case "matrix":
			if ( a.n != b.m ) {
				error("Error in mul(A,B): A.n = " + a.n + " != " + b.m + " = B.m.");
				return undefined;
			}
			return mulspMatrixMatrix(a,b);
			break;
		case "spmatrix":
			if ( a.n != b.m ) {
				error("Error in mul(A,B): A.n = " + a.n + " != " + b.m + " = B.m.");
				return undefined;
			}
			return mulspMatrixspMatrix(a,b);
			break;
		default:
			return undefined;
			break;
		}
		break;
	case "ComplexMatrix":
		switch( type(b) ) {
		case "number":
			return mulScalarComplexMatrix(b,a);
			break;
		case "Complex":
			return mulComplexComplexMatrix(b,a);
			break;
		case "vector":
			if ( a.m == 1 ) {
				// dot product with explicit transpose
				if ( a.val.length != b.length ) {
					error("Error in mul(a',b): a.length = " + a.val.length + " != " + b.length + " =  b.length.");
					return undefined;
				}
				return dotComplexVectorVector(new ComplexVector(a.re,a.im,true), b);
			}
			else {
				if ( a.n != b.length ) {
					error("Error in mul(A,b): A.n = " + a.n + " != " + b.length + " = b.length.");
					return undefined;
				}
				return mulComplexMatrixVector(a,b);
			}
			break;
		case "spvector":
			if ( a.m == 1 ) {
				// dot product with explicit transpose
				if ( a.val.length != b.length ) {
					error("Error in mul(a',b): a.length = " + a.val.length + " != " + b.length + " =  b.length.");
					return undefined;
				}
				return dotComplexVectorspVector(new ComplexVector(a.re,a.im,true), b);
			}
			else {
				if ( a.n != b.length ) {
					error("Error in mul(A,b): A.n = " + a.n + " != " + b.length + " = b.length.");
					return undefined;
				}
				return mulComplexMatrixspVector(a,b);
			}
			break;
		case "ComplexVector":
			if ( a.m == 1 ) {
				// dot product with explicit transpose
				if ( a.val.length != b.length ) {
					error("Error in mul(a',b): a.length = " + a.val.length + " != " + b.length + " =  b.length.");
					return undefined;
				}
				return dotComplexVectors(new ComplexVector(a.re,a.im,true), b);
			}
			else {
				if ( a.n != b.length ) {
					error("Error in mul(A,b): A.n = " + a.n + " != " + b.length + " = b.length.");
					return undefined;
				}
				return mulComplexMatrixComplexVector(a,b);
			}
			break;
		case "matrix":
			if ( a.n != b.m ) {
				error("Error in mul(A,B): A.n = " + a.n + " != " + b.m + " = B.m.");
				return undefined;
			}
			return mulComplexMatrixMatrix(a,b);
			break;
		case "spmatrix":
			if ( a.n != b.m ) {
				error("Error in mul(A,B): A.n = " + a.n + " != " + b.m + " = B.m.");
				return undefined;
			}
			return mulComplexMatrixspMatrix(a,b);
			break;
		case "ComplexMatrix":
			if ( a.n != b.m ) {
				error("Error in mul(A,B): A.n = " + a.n + " != " + b.m + " = B.m.");
				return undefined;
			}
			return mulComplexMatrices(a,b);
			break;
		default:
			return undefined;
			break;
		}
		break;
	default:
		return undefined;
		break;
	}
}

/**
 * @param {number}
 * @param {Float64Array}
 * @return {Float64Array}
 */
function mulScalarVector( scalar, vec ) {
	var i;
	const n = vec.length;
	var res = new Float64Array(vec);
	for ( i=0; i < n; i++)
		res[i] *= scalar ;
	return res;
}
/**
 * @param {number}
 * @param {Matrix}
 * @return {Matrix}
 */
function mulScalarMatrix( scalar, A ) {
	var res = new Matrix(A.m,A.n, mulScalarVector(scalar, A.val), true );

	return res;
}

/**
 * @param {Float64Array}
 * @param {Float64Array}
 * @return {number}
 */
function dot(a, b) {
	const n = a.length;
	var i;
	var res = 0;
	for ( i=0; i< n; i++)
		res += a[i]*b[i];
	return res;
}

/**
 * @param {Matrix}
 * @param {Float64Array}
 * @return {Float64Array}
 */
function mulMatrixVector( A, b ) {
	const m = A.length;
	var c = new Float64Array(m);
	var r = 0;
	for (var i=0; i < m; i++) {
		c[i] = dot(A.val.subarray(r, r+A.n), b);
		r += A.n;
	}

	return c;
}
/**
 * @param {Matrix}
 * @param {Float64Array}
 * @return {Float64Array}
 */
function mulMatrixTransVector( A, b ) {
	const m = A.length;
	const n = A.n;
	var c = new Float64Array(n);
	var rj = 0;
	for (var j=0; j < m; j++) {
		var bj = b[j];
		for (var i=0; i < n; i++) {
			c[i] += A.val[rj + i] * bj;
		}
		rj += A.n;
	}
	return c;
}
/**
 * @param {Matrix}
 * @param {Matrix}
 * @return {Matrix}
 */
function mulMatrixMatrix(A, B) {
	const m = A.length;
	const n = B.n;
	const n2 = B.length;

	var Av = A.val;
	var Bv = B.val;

	var C = new Float64Array(m*n);
	var aik;
	var Aik = 0;
	var Ci = 0;
	for (var i=0;i < m ; i++) {
		var bj = 0;
		for (var k=0; k < n2; k++ ) {
			aik = Av[Aik];
			for (var j =0; j < n; j++) {
				C[Ci + j] += aik * Bv[bj];
				bj++;
			}
			Aik++;
		}
		Ci += n;
	}
	return  new Matrix(m,n,C, true);
}
/**
 * @param {Float64Array}
 * @param {Float64Array}
 * @return {Float64Array}
 */
function entrywisemulVector( a, b) {
	var i;
	const n = a.length;
	var res = new Float64Array(n);
	for ( i=0; i < n; i++)
		res[i] = a[i] * b[i];
	return res;
}
/**
 * @param {Matrix}
 * @param {Matrix}
 * @return {Matrix}
 */
function entrywisemulMatrix( A, B) {
	var res = new Matrix(A.m,A.n, entrywisemulVector(A.val, B.val), true );
	return res;
}


function entrywisemul(a,b) {
	var sa = size(a);
	var sb = size(b);
	if (typeof(a) != "number" && sa[0] == 1 && sa[1] == 1 )
		a = get(a, 0, 0);
	if (typeof(b) != "number" && sb[0] == 1 && sb[1] == 1 )
		b = get(b, 0, 0);

	switch( type(a) ) {
	case "number":
		switch( type(b) ) {
		case "number":
			return a*b;
			break;
		case "Complex":
			return mulComplexReal(b,a);
			break;
		case "vector":
			return mulScalarVector(a,b);
			break;
		case "spvector":
			return mulScalarspVector(a,b);
			break;
		case "ComplexVector":
			return mulScalarComplexVector(b,a);
			break;
		case "matrix":
			return mulScalarMatrix(a,b);
			break;
		case "spmatrix":
			return mulScalarspMatrix(a,b);
			break;
		case "ComplexMatrix":
			return mulScalarComplexMatrix(b,a);
			break;
		default:
			return undefined;
			break;
		}
		break;
	case "vector":
		switch( type(b) ) {
		case "number":
			return mulScalarVector(b,a);
			break;
		case "Complex":
			return mulComplexVector(b,a);
			break;
		case "vector":
			if ( a.length != b.length ) {
				error("Error in entrywisemul(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return entrywisemulVector(a,b);
			break;
		case "ComplexVector":
			if ( a.length != b.length ) {
				error("Error in entrywisemul(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return entrywisemulComplexVectorVector(b,a);
			break;
		case "spvector":
			if ( a.length != b.length ) {
				error("Error in entrywisemul(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return entrywisemulspVectorVector(b,a);
			break;
		case "matrix":
		case "spmatrix":
		case "ComplexMatrix":
			error("Error in entrywisemul(a,B): a is a vector and B is a matrix.");
			return undefined;
			break;
		default:
			return undefined;
			break;
		}
		break;
	case "spvector":
		switch( type(b) ) {
		case "number":
			return mulScalarspVector(b,a);
			break;
		case "vector":
			if ( a.length != b.length ) {
				error("Error in entrywisemul(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return entrywisemulspVectorVector(a,b);
			break;
		case "spvector":
			if ( a.length != b.length ) {
				error("Error in entrywisemul(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return entrywisemulspVectors(a,b);
			break;
		case "matrix":
			error("Error in entrywisemul(a,B): a is a vector and B is a Matrix.");
			return undefined;
			break;
		case "spmatrix":
			error("Error in entrywisemul(a,B): a is a vector and B is a Matrix.");
			return undefined;
			break;
		default:
			return undefined;
			break;
		}
		break;
	case "matrix":
		switch( type(b) ) {
		case "number":
			return mulScalarMatrix(b,a);
			break;
		case "Complex":
			return mulComplexMatrix(b,a);
			break;
		case "vector":
		case "spvector":
		case "ComplexVector":
			error("Error in entrywisemul(A,b): A is a Matrix and b is a vector.");
			return undefined;
			break;
		case "matrix":
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in entrywisemul(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return entrywisemulMatrix(a,b);
			break;
		case "spmatrix":
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in entrywisemul(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return entrywisemulspMatrixMatrix(b,a);
			break;
		case "ComplexMatrix":
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in entrywisemul(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return entrywisemulComplexMatrixMatrix(b,a);
			break;
		default:
			return undefined;
			break;
		}
		break;
	case "spmatrix":
		switch( type(b) ) {
		case "number":
			return mulScalarspMatrix(b,a);
			break;
		case "vector":
			error("Error in entrywisemul(A,b): A is a Matrix and b is a vector.");
			return undefined;
			break;
		case "spvector":
			error("Error in entrywisemul(A,b): A is a Matrix and b is a vector.");
			return undefined;
			break;
		case "matrix":
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in entrywisemul(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return entrywisemulspMatrixMatrix(a,b);
			break;
		case "spmatrix":
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in entrywisemul(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return entrywisemulspMatrices(a,b);
			break;
		default:
			return undefined;
			break;
		}
		break;
	case "ComplexVector":
		switch( type(b) ) {
		case "number":
			return mulScalarComplexVector(b,a);
			break;
		case "Complex":
			return mulComplexComplexVector(b,a);
			break;
		case "vector":
			if ( a.length != b.length ) {
				error("Error in entrywisemul(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return entrywisemulComplexVectorVector(a,b);
			break;
		case "ComplexVector":
			if ( a.length != b.length ) {
				error("Error in entrywisemul(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return entrywisemulComplexVectors(a,b);
			break;
		case "spvector":
			if ( a.length != b.length ) {
				error("Error in entrywisemul(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return entrywisemulComplexVectorspVector(a,b);
			break;
		case "matrix":
		case "spmatrix":
		case "ComplexMatrix":
			error("Error in entrywisemul(a,B): a is a vector and B is a matrix.");
			return undefined;
			break;
		default:
			return undefined;
			break;
		}
		break;
	case "ComplexMatrix":
		switch( type(b) ) {
		case "number":
			return mulScalarComplexMatrix(b,a);
			break;
		case "Complex":
			return mulComplexComplexMatrix(b,a);
			break;
		case "vector":
		case "spvector":
		case "ComplexVector":
			error("Error in entrywisemul(A,b): A is a Matrix and b is a vector.");
			return undefined;
			break;
		case "matrix":
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in entrywisemul(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return entrywisemulComplexMatrixMatrix(a,b);
			break;
		case "spmatrix":
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in entrywisemul(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return entrywisemulComplexMatrixspMatrix(a,b);
			break;
		case "ComplexMatrix":
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in entrywisemul(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return entrywisemulComplexMatrices(a,b);
			break;
		default:
			return undefined;
			break;
		}
		break;
	default:
		return undefined;
		break;
	}
}


/** SAXPY : y = y + ax
 * @param {number}
 * @param {Float64Array}
 * @param {Float64Array}
 */
function saxpy ( a, x, y) {
	const n = y.length;
	for ( var i=0; i < n; i++)
		y[i] += a*x[i];
}
/** GAXPY : y = y + Ax
 * @param {Matrix}
 * @param {Float64Array}
 * @param {Float64Array}
 */
function gaxpy ( A, x, y) {
	const m = A.m;
	const n = A.n;
	var r = 0;
	for ( var i=0; i < m; i++) {
		y[i] += dot(A.val.subarray(r, r + n),x);
		r += n;
	}
}

/**
 * @param {Float64Array}
 * @param {number}
 * @return {Float64Array}
 */
function divVectorScalar( a, b) {
	var i;
	const n = a.length;
	var res = new Float64Array(a);
	for ( i=0; i < n; i++)
		res[i] /= b;
	return res;
}
/**
 * @param {number}
 * @param {Float64Array}
 * @return {Float64Array}
 */
function divScalarVector ( a, b) {
	var i;
	const n = b.length;
	var res = new Float64Array(n);
	for ( i=0; i < n; i++)
		res[i] = a / b[i];
	return res;
}
/**
 * @param {Float64Array}
 * @param {Float64Array}
 * @return {Float64Array}
 */
function divVectors( a, b) {
	var i;
	const n = a.length;
	var res = new Float64Array(a);
	for ( i=0; i < n; i++)
		res[i] /= b[i];
	return res;
}
/**
 * @param {Matrix}
 * @param {number}
 * @return {Matrix}
 */
function divMatrixScalar( A, b) {
	var res = new Matrix(A.m, A.n, divVectorScalar(A.val , b ), true);
	return res;
}
/**
 * @param {number}
 * @param {Matrix}
 * @return {Matrix}
 */
function divScalarMatrix( a, B) {
	var res = new Matrix(B.m, B.n, divScalarVector(a, B.val ), true);
	return res;
}
/**
 * @param {Matrix}
 * @param {Matrix}
 * @return {Matrix}
 */
function divMatrices( A, B) {
	var res = new Matrix(A.m, A.n, divVectors(A.val, B.val ), true);
	return res;
}

function entrywisediv(a,b) {
	var ta = type(a);
	var tb = type(b);

	switch(ta) {
		case "number":
			switch(tb) {
			case "number":
				return a/b;
				break;
			case "vector":
				return divScalarVector(a,b);
				break;
			case "matrix":
				return divScalarMatrix(a,b);
				break;
			case "spvector":
				return divScalarspVector(a,b);
				break;
			case "spmatrix":
				return divScalarspMatrix(a,b);
				break;
			default:
				error("Error in entrywisediv(a,b): b must be a number, a vector or a matrix.");
				return undefined;
			}
			break;
		case "vector":
			switch(tb) {
			case "number":
				return divVectorScalar(a,b);
				break;
			case "vector":
				if ( a.length != b.length ) {
					error("Error in entrywisediv(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
					return undefined;
				}
				return divVectors(a,b);
				break;
			case "spvector":
				error("Error in entrywisediv(a,b): b is a sparse vector with zeros.");
				break;
			default:
				error("Error in entrywisediv(a,B): a is a vector and B is a " + tb + ".");
				return undefined;
			}
			break;
		case "spvector":
			switch(tb) {
			case "number":
				return mulScalarspVector(1/b, a);
				break;
			case "vector":
				if ( a.length != b.length ) {
					error("Error in entrywisediv(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
					return undefined;
				}
				return divVectorspVector(a,b);
				break;
			case "spvector":
				error("Error in entrywisediv(a,b): b is a sparse vector with zeros.");
				return undefined;
				break;
			default:
				error("Error in entrywisediv(a,B): a is a vector and B is a " + tb + ".");
				return undefined;
			}
			break;
		case "matrix":
			switch(tb) {
			case "number":
				return divMatrixScalar(a,b);
				break;
			case "matrix":
				if ( a.m != b.m || a.n != b.n ) {
					error("Error in entrywisediv(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
					return undefined;
				}
				return divMatrices(a,b);
				break;
			case "spmatrix":
				error("Error in entrywisediv(A,B): B is a sparse matrix with zeros.");
				return undefined;
				break;
			default:
				error("Error in entrywisediv(A,b): a is a matrix and B is a " + tb + ".");
				return undefined;
			}
		case "spmatrix":
			switch(tb) {
			case "number":
				return mulScalarspMatrix(1/b,a);
				break;
			case "matrix":
				if ( a.m != b.m || a.n != b.n ) {
					error("Error in entrywisediv(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
					return undefined;
				}
				return divMatrixspMatrix(a,b);
				break;
			case "spmatrix":
				error("Error in entrywisediv(A,B): B is a sparse matrix with zeros.");
				return undefined;
				break;
			default:
				error("Error in entrywisediv(A,b): a is a matrix and B is a " + tb + ".");
				return undefined;
			}
			break;
		default:
			error("Error in entrywisediv(a,b): a must be a number, a vector or a matrix.");
			return undefined;
			break;
	}
}

function outerprodVectors(a, b, scalar) {
	var i;
	var j;
	var ui;
	const m = a.length;
	const n = b.length;
	var res = new Matrix(m,n);
	if( arguments.length == 3 ) {
		for (i=0; i< m; i++)
			res.val.set( mulScalarVector(scalar*a[i], b), i*n);
	}
	else {
		for (i=0; i< m; i++)
			res.val.set( mulScalarVector(a[i], b), i*n);
	}
	return res;
}
function outerprod( u , v, scalar ) {
	// outer product of two vectors : res = scalar * u * v^T

	if (typeof(u) == "number" ) {
		if ( typeof(v) == "number" ) {
			if ( arguments.length == 2 )
				return u*v;
			else
				return u*v*scalar;
		}
		else {
			if ( arguments.length == 2 )
				return new Matrix(1,v.length, mulScalarVector(u, v), true );
			else
				return new Matrix(1,v.length, mulScalarVector(u*scalar, v), true );
		}
	}
	if ( u.length == 1 ) {
		if ( typeof(v) == "number" ) {
			if ( arguments.length == 2 )
				return u[0]*v;
			else
				return u[0]*v*scalar;
		}
		else  {
			if ( arguments.length == 2 )
				return new Matrix(1,v.length, mulScalarVector(u[0], v) , true);
			else
				return new Matrix(1,v.length, mulScalarVector(u[0]*scalar, v), true );
		}
	}
	if (typeof(v) == "number" ) {
		if (arguments.length == 2 )
			return mulScalarVector(v, u);
		else
			return mulScalarVector( scalar * v , u);
	}
	if ( v.length == 1) {
		if ( arguments.length == 2 )
			return mulScalarVector(v[0], u);
		else
			return mulScalarVector( scalar * v[0] , u);
	}

	if ( arguments.length == 2 )
		return outerprodVectors(u,v);
	else
		return outerprodVectors(u,v, scalar);
}
/**
 * @param {number}
 * @param {Float64Array}
 * @return {Float64Array}
 */
function addScalarVector ( scalar, vec ) {
	const n = vec.length;
	var res = new Float64Array(vec);
	for (var i = 0 ; i< n; i++)
		res[i] += scalar ;

	return res;
}
/**
 * @param {number}
 * @param {Matrix}
 * @return {Matrix}
 */
function addScalarMatrix(a, B ) {
	return new Matrix(B.m, B.n, addScalarVector(a, B.val), true );
}
/**
 * @param {Float64Array}
 * @param {Float64Array}
 * @return {Float64Array}
 */
function addVectors(a,b) {
	const n = a.length;
	var c = new Float64Array(a);
	for (var i=0; i < n; i++)
		c[i] += b[i];
	return c;
}
/**
 * @param {Matrix}
 * @param {Matrix}
 * @return {Matrix}
 */
function addMatrices(A,B) {
	return new Matrix(A.m, A.n, addVectors(A.val, B.val) , true);
}
function add(a,b) {

	const ta = type(a);
	const tb = type(b);
	if ( ta == "number" && tb == "number" || ta == "string" || tb == "string")
		return a + b;
	else if ( ta == "number") {
		switch(tb) {
		case "Complex":
			return addComplexReal(b,a);
			break;
		case "vector":
			return addScalarVector(a,b);
			break;
		case "matrix":
			return addScalarMatrix(a,b);
			break;
		case "spvector":
			return addScalarspVector(a,b);
			break;
		case "spmatrix":
			return addScalarspMatrix(a,b);
			break;
		case "ComplexVector":
			return addScalarComplexVector(a,b);
			break;
		case "ComplexMatrix":
			return addScalarComplexMatrix(a,b);
			break;
		default:
			return undefined;
			break;
		}
	}
	else if ( tb == "number" ) {
		switch(ta) {
		case "Complex":
			return addComplexReal(a,b);
			break;
		case "vector":
			return addScalarVector(b,a);
			break;
		case "matrix":
			return addScalarMatrix(b,a);
			break;
		case "spvector":
			return addScalarspVector(b,a);
			break;
		case "spmatrix":
			return addScalarspMatrix(b,a);
			break;
		case "ComplexVector":
			return addScalarComplexVector(b,a);
			break;
		case "ComplexMatrix":
			return addScalarComplexMatrix(b,a);
			break;
		default:
			return undefined;
			break;
		}
	}
	else if ( ta == "vector" ) {
		switch(tb) {
		case "vector":
			// vector addition
			if ( a.length != b.length ) {
				error("Error in add(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return addVectors(a,b);
			break;
		case "spvector":
			if ( a.length != b.length ) {
				error("Error in add(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return addVectorspVector(a,b);
			break;
		case "ComplexVector":
			if ( a.length != b.length ) {
				error("Error in add(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return addComplexVectorVector(b,a);
			break;
		case "matrix":
		case "spmatrix":
		default:
			error("Error in add(a,B): a is a vector and B is a " + tb + ".");
			return undefined;
			break;
		}
	}
	else if ( ta == "matrix" ) {
		switch(tb) {
		case "matrix":
			// Matrix addition
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in add(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return addMatrices(a,b);
			break;
		case "spmatrix":
			// Matrix addition
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in add(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return addMatrixspMatrix(a,b);
			break;
		case "ComplexMatrix":
			// Matrix addition
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in add(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return addComplexMatrixMatrix(b,a);
			break;
		case "vector":
		case "spvector":
		default:
			error("Error in add(A,b): a is a matrix and B is a " + tb + ".");
			return undefined;
			break;
		}
	}
	else if ( ta == "spvector" ) {
		switch(tb) {
		case "vector":
			// vector addition
			if ( a.length != b.length ) {
				error("Error in add(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return addVectorspVector(b,a);
			break;
		case "spvector":
			if ( a.length != b.length ) {
				error("Error in add(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return addspVectors(a,b);
			break;
		case "matrix":
		case "spmatrix":
		default:
			error("Error in add(a,B): a is a sparse vector and B is a " + tb + ".");
			return undefined;
			break;
		}
	}
	else if ( ta == "spmatrix" ) {
		switch(tb) {
		case "matrix":
			// Matrix addition
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in add(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return addMatrixspMatrix(b,a);
			break;
		case "spmatrix":
			// Matrix addition
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in add(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return addspMatrices(a,b);
			break;
		case "vector":
		case "spvector":
		default:
			error("Error in add(A,b): a is a sparse matrix and B is a " + tb + ".");
			return undefined;
			break;
		}
	}
	else if ( ta == "ComplexVector" ) {
		switch(tb) {
		case "vector":
			// vector addition
			if ( a.length != b.length ) {
				error("Error in add(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return addComplexVectorVector(a,b);
			break;
		case "spvector":
			if ( a.length != b.length ) {
				error("Error in add(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return addComplexVectorspVector(a,b);
			break;
		case "ComplexVector":
			if ( a.length != b.length ) {
				error("Error in add(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return addComplexVectors(b,a);
			break;
		case "matrix":
		case "spmatrix":
		default:
			error("Error in add(a,B): a is a vector and B is a " + tb + ".");
			return undefined;
			break;
		}
	}
	else if ( ta == "ComplexMatrix" ) {
		switch(tb) {
		case "matrix":
			// Matrix addition
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in add(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return addComplexMatrixMatrix(a,b);
			break;
		case "spmatrix":
			// Matrix addition
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in add(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return addComplexMatrixspMatrix(a,b);
			break;
		case "ComplexMatrix":
			// Matrix addition
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in add(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return addComplexMatrices(a,b);
			break;
		case "vector":
		case "spvector":
		default:
			error("Error in add(A,b): a is a matrix and B is a " + tb + ".");
			return undefined;
			break;
		}
	}
	else
		return undefined;
}
/**
 * @param {number}
 * @param {Float64Array}
 * @return {Float64Array}
 */
function subScalarVector ( scalar, vec ) {
	const n = vec.length;
	var res = new Float64Array(n);
	for (var i = 0 ; i< n; i++)
		res[i] = scalar - vec[i];

	return res;
}
/**
 * @param {Float64Array}
 * @param {number}
 * @return {Float64Array}
 */
function subVectorScalar ( vec, scalar ) {
	const n = vec.length;
	var res = new Float64Array(vec);
	for (var i = 0 ; i< n; i++)
		res[i] -= scalar;

	return res;
}
/**
 * @param {number}
 * @param {Matrix}
 * @return {Matrix}
 */
function subScalarMatrix(a, B ) {
	return new Matrix(B.m, B.n, subScalarVector(a, B.val), true );
}
/**
 * @param {Matrix}
 * @param {number}
 * @return {Matrix}
 */
function subMatrixScalar(B, a ) {
	return new Matrix(B.m, B.n, subVectorScalar(B.val, a) , true);
}
/**
 * @param {Float64Array}
 * @param {Float64Array}
 * @return {Float64Array}
 */
function subVectors(a,b) {
	const n = a.length;
	var c = new Float64Array(a);
	for (var i=0; i < n; i++)
		c[i] -= b[i];
	return c;
}
/**
 * @param {Matrix}
 * @param {Matrix}
 * @return {Matrix}
 */
function subMatrices(A,B) {
	return new Matrix(A.m, A.n, subVectors(A.val, B.val), true );
}
function sub(a,b) {

	const ta = type(a);
	const tb = type(b);
	if ( ta == "number" && tb == "number" )
		return a - b;
	else if ( ta == "number") {
		switch(tb) {
		case "Complex":
			return addComplexReal(minusComplex(b),a);
			break;
		case "vector":
			return subScalarVector(a,b);
			break;
		case "matrix":
			return subScalarMatrix(a,b);
			break;
		case "spvector":
			return subScalarspVector(a,b);
			break;
		case "spmatrix":
			return subScalarspMatrix(a,b);
			break;
		default:
			return undefined;
			break;
		}
	}
	else if ( tb == "number" ) {
		switch(ta) {
		case "Complex":
			return addComplexReal(b,-a);
			break;
		case "vector":
			return subVectorScalar (a, b);
			break;
		case "matrix":
			return subMatrixScalar(a,b);
			break;
		case "spvector":
			return addScalarspVector(-b,a);
			break;
		case "spmatrix":
			return addScalarspMatrix(-b,a);
			break;
		default:
			return undefined;
			break;
		}
	}
	else if ( ta == "vector" ) {
		switch(tb) {
		case "vector":
			// vector substraction
			if ( a.length != b.length ) {
				error("Error in sub(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return subVectors(a,b);
			break;
		case "spvector":
			// vector substraction
			if ( a.length != b.length ) {
				error("Error in sub(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return subVectorspVector(a,b);
			break;
		case "matrix":
		case "spmatrix":
		default:
			error("Error in sub(a,B): a is a vector and B is a " + tb + ".");
			return undefined;
			break;
		}
	}
	else if ( ta == "matrix" ) {
		switch(tb) {
		case "matrix":
			// Matrix sub
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in sub(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return subMatrices(a,b);
			break;
		case "spmatrix":
			// Matrix addition
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in sub(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return subMatrixspMatrix(a,b);
			break;
		case "vector":
		case "spvector":
		default:
			error("Error in sub(A,b): A is a matrix and b is a " + tb + ".");
			return undefined;
			break;
		}
	}
	else if ( ta == "spvector" ) {
		switch(tb) {
		case "vector":
			if ( a.length != b.length ) {
				error("Error in sub(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return subspVectorVector(a,b);
			break;
		case "spvector":
			if ( a.length != b.length ) {
				error("Error in sub(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return subspVectors(a,b);
			break;
		case "matrix":
		case "spmatrix":
		default:
			error("Error in sub(a,B): a is a sparse vector and B is a " + tb + ".");
			return undefined;
			break;
		}
	}
	else if ( ta == "spmatrix" ) {
		switch(tb) {
		case "matrix":
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in sub(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return subspMatrixMatrix(a,b);
			break;
		case "spmatrix":
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in sub(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return subspMatrices(a,b);
			break;
		case "vector":
		case "spvector":
		default:
			error("Error in sub(A,b): a is a sparse matrix and B is a " + tb + ".");
			return undefined;
			break;
		}
	}
	else
		return undefined;
}

function pow(a,b) {
	var i;
	const ta = type(a);
	const tb = type(b);

	if ( ta == "number" && tb == "number" )
		return Math.pow(a, b);
	else if ( ta == "number") {
		if ( tb == "vector" ) {
			var c = zeros(b.length);
			if ( !isZero(a) ) {
				for (i=0;i<b.length;i++) {
					c[i] = Math.pow(a, b[i]);
				}
			}
			return c;
		}
		else {
			var c = new Matrix( b.m, b.n, pow(a, b.val), true);
			return c;
		}
	}
	else if ( tb == "number" ) {
		if ( ta == "vector" ) {
			var c = zeros(a.length);
			for (i=0; i < a.length; i++)
				c[i] = Math.pow(a[i], b);
			return c;
		}
		else {
			var c = new Matrix( a.m, a.n, pow(a.val, b), true);
			return c;
		}
	}
	else if ( ta == "vector" ) {
		if ( tb == "vector" ) {
			// entry-wise power
			if ( a.length != b.length ) {
				error("Error in pow(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			var c = zeros(a.length);
			for ( i=0; i<a.length; i++ ) {
				c[i] = Math.pow(a[i], b[i]);
			}
			return c;
		}
		else {
			// vector + matrix
			return "undefined";
		}
	}
	else {
		if ( tb == "vector" ) {
			// matrix + vector
			return "undefined";
		}
		else {
			// entry-wise power
			var c = new Matrix( a.m, a.n, pow(a.val, b.val), true);
			return c;
		}
	}
}

function minus ( x ) {

	switch(type(x)) {
	case "number":
		return -x;
		break;
	case "vector":
		return minusVector(x);
		break;
	case "spvector":
		return new spVector(x.length, minusVector(x.val), x.ind );
		break;
	case "ComplexVector":
		return minusComplexVector(x);
		break;
	case "matrix":
		return new Matrix(x.m, x.n, minusVector(x.val), true );
		break;
	case "spmatrix":
		return new spMatrix(x.m, x.n, minusVector(x.val), x.cols, x.rows );
		break;
	case "ComplexMatrix":
		return minusComplexMatrix(x);
		break;
	default:
		return undefined;
	}
}
/**
 * @param {Float64Array}
 * @return {Float64Array}
 */
function minusVector( x ) {
	var res = new Float64Array(x.length);
	for (var i =0; i < x.length; i++)
		res[i] = -x[i];
	return res;
}
/**
 * @param {Matrix}
 * @return {Matrix}
 */
function minusMatrix( x ) {
	return new Matrix(x.m, x.n, minusVector(x.val), true );
}
// minimum

/**
 * @param {Float64Array}
 * @return {number}
 */
function minVector( a ) {
	const n = a.length;
	var res = a[0];
	for (var i = 1; i < n ; i++) {
		if ( a[i] < res)
			res = a[i];
	}
	return res;
}
/**
 * @param {Matrix}
 * @return {number}
 */
function minMatrix( A ) {
	return minVector(A.val);
}
/**
 * @param {Float64Array}
 * @param {number}
 * @return {Float64Array}
 */
function minVectorScalar(vec, scalar ) {
	var n = vec.length;
	var res = new Float64Array(vec);
	for (var i = 0; i < n ; i++) {
		if ( scalar < vec[i])
			res[i] = scalar;
	}
	return res;
}
/**
 * @param {Matrix}
 * @param {number}
 * @return {Matrix}
 */
function minMatrixScalar(A, scalar ) {
	return new Matrix(A.m, A.n, minVectorScalar(A.val, scalar), true);
}
/**
 * @param {Matrix}
 * @return {Matrix}
 */
function minMatrixRows( A ) {
	const m = A.m;
	const n = A.n;
	var res = new Float64Array(A.val.subarray(0,n) );
	var j;
	var r = n;
	for ( var i=1; i < m; i++) {
		for ( j = 0; j < n; j++)
			if( A.val[r + j] < res[j])
				res[j] = A.val[r + j];
		r += n;
	}
	return new Matrix(1,n,res, true);
}
/**
 * @param {Matrix}
 * @return {Float64Array}
 */
function minMatrixCols( A ) {
	var m = A.m;
	var res = new Float64Array(m);
	var r = 0;
	for ( var i=0; i < m; i++) {
		res[i] = minVector(A.val.subarray(r, r+A.n) );
		r += A.n;
	}
	return res;
}
/**
 * @param {Float64Array}
 * @param {Float64Array}
 * @return {Float64Array}
 */
function minVectorVector(a, b) {
	const n = a.length;
	var res = new Float64Array(a);
	for (var i = 0; i < n ; i++) {
		if ( b[i] < a[i])
			res[i] = b[i];
	}
	return res;
}
/**
 * @param {Matrix}
 * @param {Matrix}
 * @return {Matrix}
 */
function minMatrixMatrix( A, B ) {
	return new Matrix(A.m, A.n, minVectorVector(A.val, B.val), true);
}
function min(a,b) {
	var ta = type(a);

	if ( arguments.length == 1 ) {
		switch( ta ) {
		case "vector":
			return minVector(a);
			break;
		case "spvector":
			var m = minVector(a.val);
			if ( m > 0 && a.val.length < a.length )
				return 0;
			else
				return m;
			break;
		case "matrix":
			return minMatrix(a);
			break;
		case "spmatrix":
			var m = minVector(a.val);
			if ( m > 0 && a.val.length < a.m * a.n )
				return 0;
			else
				return m;
			break;
		default:
			return a;
			break;
		}
	}

	var tb = type(b);
	if (ta == "spvector" ) {
		a = fullVector(a);
		ta = "vector";
	}
	if (ta == "spmatrix" ) {
		a = fullMatrix(a);
		ta = "matrix";
	}
	if (tb == "spvector" ) {
		b = fullVector(b);
		tb = "vector";
	}
	if (tb == "spmatrix" ) {
		b = fullMatrix(b);
		tb = "matrix";
	}

	if ( ta == "number" && tb == "number" )
		return Math.min(a,b);
	else if ( ta == "number") {
		if ( tb == "vector" )
			return minVectorScalar(b, a ) ;
		else
			return minMatrixScalar(b, a ) ;
	}
	else if ( tb == "number" ) {
		if ( ta == "vector" )
			return minVectorScalar(a, b);
		else {
			// MAtrix , scalar
			if ( b == 1)
				return minMatrixRows(a); // return row vector of min of columns
			else if ( b == 2 )
				return minMatrixCols(a); // return column vector of min of rows
			else
				return minMatrixScalar(a, b);
		}
	}
	else if ( ta == "vector" ) {
		if ( tb == "vector" )
			return minVectorVector(a,b);
		else
			return "undefined";
	}
	else {
		if ( tb == "matrix" )
			return minMatrixMatrix(a,b);
		else
			return "undefined";
	}
}

// maximum
/**
 * @param {Float64Array}
 * @return {number}
 */
function maxVector( a ) {
	const n = a.length;
	var res = a[0];
	for (var i = 1; i < n ; i++) {
		if ( a[i] > res)
			res = a[i];
	}
	return res;
}
/**
 * @param {Matrix}
 * @return {number}
 */
function maxMatrix( A ) {
	return maxVector(A.val);
}
/**
 * @param {Float64Array}
 * @param {number}
 * @return {Float64Array}
 */
function maxVectorScalar(vec, scalar ) {
	const n = vec.length;
	var res = new Float64Array(vec);
	for (var i = 0; i < n ; i++) {
		if ( scalar > vec[i])
			res[i] = scalar;
	}
	return res;
}
/**
 * @param {Matrix}
 * @param {number}
 * @return {Matrix}
 */
function maxMatrixScalar(A, scalar ) {
	return maxVectorScalar(A.val, scalar);
}
/**
 * @param {Matrix}
 * @return {Matrix}
 */
function maxMatrixRows( A ) {
	const m = A.m;
	const n = A.n;
	var res = new Float64Array(A.val.subarray(0,n) );
	var j;
	var r = n;
	for ( var i=1; i < m; i++) {
		for ( j = 0; j < n; j++)
			if( A.val[r + j] > res[j])
				res[j] = A.val[r + j];
		r += n;
	}
	return new Matrix(1,n,res,true);
}
/**
 * @param {Matrix}
 * @return {Float64Array}
 */
function maxMatrixCols( A ) {
	const m = A.m;
	var res = new Float64Array(m);
	var r = 0;
	for ( var i=0; i < m; i++) {
		res[i] = maxVector(A.val.subarray(r, r+A.n) );
		r += A.n;
	}
	return res;
}
/**
 * @param {Float64Array}
 * @param {Float64Array}
 * @return {Float64Array}
 */
function maxVectorVector(a, b) {
	var n = a.length;
	var res = new Float64Array(a);
	for (var i = 0; i < n ; i++) {
		if ( b[i] > a[i])
			res[i] = b[i];
	}
	return res;
}
/**
 * @param {Matrix}
 * @param {Matrix}
 * @return {Matrix}
 */
function maxMatrixMatrix( A, B ) {
	return new Matrix(A.m, A.n, maxVectorVector(A.val, B.val), true);
}
function max(a,b) {
	var ta = type(a);

	if ( arguments.length == 1 ) {
		switch( ta ) {
		case "vector":
			return maxVector(a);
			break;
		case "spvector":
			var m = maxVector(a.val);
			if ( m < 0 && a.val.length < a.length )
				return 0;
			else
				return m;
			break;
		case "matrix":
			return maxMatrix(a);
			break;
		case "spmatrix":
			var m = maxVector(a.val);
			if ( m < 0 && a.val.length < a.m * a.n )
				return 0;
			else
				return m;
			break;
		default:
			return a;
			break;
		}
	}

	var tb = type(b);
	if (ta == "spvector" ) {
		a = fullVector(a);
		ta = "vector";
	}
	if (ta == "spmatrix" ) {
		a = fullMatrix(a);
		ta = "matrix";
	}
	if (tb == "spvector" ) {
		b = fullVector(b);
		tb = "vector";
	}
	if (tb == "spmatrix" ) {
		b = fullMatrix(b);
		tb = "matrix";
	}

	if ( ta == "number" && tb == "number" )
		return Math.max(a,b);
	else if ( ta == "number") {
		if ( tb == "vector" )
			return maxVectorScalar(b, a ) ;
		else
			return maxMatrixScalar(b, a ) ;
	}
	else if ( tb == "number" ) {
		if ( ta == "vector" )
			return maxVectorScalar(a, b);
		else {
			// MAtrix , scalar
			if ( b == 1)
				return maxMatrixRows(a); // return row vector of max of columns
			else if ( b == 2 )
				return maxMatrixCols(a); // return column vector of max of rows
			else
				return maxMatrixScalar(a, b);
		}
	}
	else if ( ta == "vector" ) {
		if ( tb == "vector" )
			return maxVectorVector(a,b);
		else
			return "undefined";
	}
	else {
		if ( tb == "matrix" )
			return maxMatrixMatrix(a,b);
		else
			return "undefined";
	}
}
/**
 * @param {Matrix}
 */
function transposeMatrix ( A ) {
	var i;
	var j;
	const m = A.m;
	const n = A.n;
	if ( m > 1 ) {
		var res = zeros( n,m);
		var Aj = 0;
		for ( j=0; j< m;j++) {
			var ri = 0;
			for ( i=0; i < n ; i++) {
				res.val[ri + j] = A.val[Aj + i];
				ri += m;
			}
			Aj += n;
		}
		return res;
	}
	else {
		return A.val;
	}
}
/**
 * @param {Float64Array}
 * @return {Matrix}
 */
function transposeVector ( a ) {
	return new Matrix(1,a.length, a);
}
function transpose( A ) {
	var i;
	var j;
	switch( type( A ) ) {
		case "number":
			return A;
			break;
		case "vector":
			var res = new Matrix(1,A.length, A);
			return res;	// matrix with a single row
			break;
		case "spvector":
			return transposespVector(A);
			break;
		case "ComplexVector":
			var res = new ComplexMatrix(1,A.length, conj(A));
			return res;	// matrix with a single row
			break;
		case "matrix":
			return transposeMatrix(A);
			break;
		case "spmatrix":
			return transposespMatrix(A);
			break;
		case "ComplexMatrix":
			return transposeComplexMatrix(A);
			break;
		default:
			return undefined;
			break;
	}
}

/**
 * @param {Matrix}
 * @return {number}
 */
function det( A ) {
	const n = A.n;
	if ( A.m != n || typeof(A.m) =="undefined")
		return undefined;

	if ( n == 2 ) {
		return A.val[0]*A.val[3] - A.val[1]*A.val[2];
	}
	else {
		var detA = 0;
		var i,j;
		for ( i=0; i < n; i++ ) {
			var proddiag = 1;
			for ( j=0; j < n ; j++)
				proddiag *= A.val[( (i+j)%n ) * n + j];

			detA += proddiag;
		}
		for ( i=0; i < n; i++ ) {
			var proddiag = 1;
			for ( j=0; j < n ; j++)
				proddiag *= A.val[( (i+n-1-j)%n ) * n + j];

			detA -= proddiag;
		}
	}
	return detA;
}
function trace ( A ) {
	if ( type(A) == "matrix") {
		var n = A.length;
		if ( A.m  != n )
			return "undefined";
		var res = 0;
		for ( var i =0; i< n;i++)
			res += A.val[i*n + i];
		return res;
	}
	else {
		return undefined;
	}
}
/**
 * @param {Matrix}
 * @return {Matrix}
 */
function triu ( A ) {
	// return the upper triangular part of A
	var i;
	var j;
	const n = A.n;
	const m = A.m;
	var res = zeros(m, n);
	var im = m;
	if ( n < m )
		im = n;
	var r = 0;
	for (i=0; i < im; i++) {
		for ( j=i; j < n; j++)
			res.val[r + j] = A.val[r + j];
		r += n;
	}
	return res;
}
/**
 * @param {Matrix}
 * @return {Matrix}
 */
function tril ( A ) {
	// return the lower triangular part of A
	var i;
	var j;
	const n = A.n;
	const m = A.m;
	var res = zeros(m, n);
	var im = m;
	if ( n < m )
		im = n;
	var r = 0;
	for (i=0; i < im; i++) {
		for ( j=0; j <= i; j++)
			res.val[r + j] = A.val[r + j];
		r += n;
	}
	if ( m > im ) {
		for (i=im; i < m; i++) {
			for ( j=0; j < n; j++)
				res.val[r + j] = A.val[r + j];
			r += n;
		}
	}
	return res;
}

/**
 * @param {Matrix}
 * @return {boolean}
 */
function issymmetric ( A ) {
	const m = A.m;
	const n= A.n;
	if ( m != n )
		return false;

	for (var i=0;i < m; i++)
		for ( var j=0; j < n; j++)
			if ( A.val[i*n+j] != A.val[j*n+i] )
				return false;

	return true;
}

/** Concatenate matrices/vectors
 * @param {Array}
 * @param {boolean}
 * @return {Matrix}
 */
function mat( elems, rowwise ) {
	var k;
	var concatWithNumbers = false;
	var elemtypes = new Array(elems.length);
	for ( k=0; k < elems.length; k++) {
		elemtypes[k] = type(elems[k]);
		if ( elemtypes[k] == "number" )
			concatWithNumbers = true;
	}


	if (typeof(rowwise ) == "undefined") {
		// check if vector of numbers
		if ( type(elems) == "vector" )
			return new Float64Array(elems);

		// check if 2D Array => toMatrix rowwise
		var rowwise = true;
		for (k=0; k < elems.length; k++) {
			if ( !Array.isArray(elems[k] ) || elemtypes[k] == "vector" ) {
				rowwise = false;
				if ( elemtypes[k] == "string" )
					return elems; // received vector of strings => return it directly
			}
		}
	}

	if ( elems.length == 0 ) {
		return [];
	}

	var m = 0;
	var n = 0;
	var i;
	var j;
	if ( rowwise ) {
		var res = new Array( ) ;

		for ( k= 0; k<elems.length; k++) {
			switch( elemtypes[k] ) {
			case "matrix":
				res. push( elems[k].val ) ;
				m += elems[k].m;
				n = elems[k].n;
				break;

			case "vector":
				if ( concatWithNumbers ) {
					// return a column by concatenating vectors and numbers
					for ( var l=0; l < elems[k].length; l++)
						res.push(elems[k][l]) ;
					n = 1;
					m += elems[k].length;
				}
				else {
					// vector (auto transposed) as row in a matrix
					res.push (elems[k]) ;
					m += 1;
					n = elems[k].length;
				}
				break;

			case "number":
				res.push(elems[k]) ;
				m += 1;
				n = 1;
				break;

			case "spvector":
				return spmat(elems);

			default:
				// Array containing not only numbers...
				// probably calling mat( Array2D ) => return Array2D
				return elems;
				break;
			}
		}
		if ( n == 1) {
			var M = new Float64Array(res);
			return M;
		}
		var M = new Matrix( m , n ) ;
		var p = 0;
		for (k=0; k < res.length ; k++) {
			if(res[k].buffer) {
				M.val.set( res[k], p);
				p += res[k].length;
			}
			else {
				for ( j=0; j < res[k].length; j++)
					M.val[p+j] = res[k][j];
				p += res[k].length;
			}
		}
		return M;
	}
	else {
		// compute size
		m = size(elems[0], 1);
		for ( k= 0; k<elems.length; k++) {
			if ( elemtypes[k] == "matrix")
				n += elems[k].n;
			else
				n++;
			if ( size( elems[k], 1) != m)
				return "undefined";
		}

		// Build matrix
		var res = new Matrix(m, n);
		var c;
		for (i=0;i<m;i++) {
			c = 0; // col index
			for ( k=0;k<elems.length; k++) {
				switch( elemtypes[k] ) {
				case "matrix":
					for ( j=0; j < elems[k].n; j++) {
							res.val[i*n + j+c] = elems[k].val[i*elems[k].n + j] ;
					}
					c += elems[k].n;
					break;

				case "vector": //vector
					res.val[i*n +c]= elems[k][i] ;
					c++;
					break;

				case "number":
					res.val[i*n+c] = elems[k];
					c++;
					break;
				default:
					break;
				}
			}
		}

		return res;
	}
}
/// Relational Operators

function isEqual( a, b) {
	var i;
	var j;
	var res;
	var ta = type(a);
	var tb = type(b);

	if ( ta == "number" && tb != "number" )
		return isEqual(b,a);

	if( ta != "number" && tb == "number" ) {
		// vector/matrix + scalar
		switch( ta ) {
			case "vector":
				res = new Float64Array(a.length);
				for ( i=0; i<a.length; i++) {
					if ( isZero( a[i] - b ) )
						res[i] = 1;
				}
				return res;
				break;
			case "matrix":
				res = new Matrix(a.m, a.n, isEqual(a.val, b), true );
				return res;
				break;
			default:
				return (a==b?1:0);
		}
	}
	else if ( ta == tb ) {

		switch( ta ) {
			case "number":
				return ( isZero(a - b)?1:0 );
				break;
			case "vector":
				res = new Float64Array(a.length);
				for ( i=0; i<a.length; i++) {
					if ( isZero( a[i] - b[i] ) )
						res[i] = 1;
				}
				return res;
				break;
			case "matrix":
				res = new Matrix(a.m, a.n, isEqual(a.val, b.val) , true);
				return res;
				break;
			default:
				return (a==b?1:0);
		}
	}
	else
		return "undefined";
}
function isNotEqual( a, b) {
	var i;
	var j;
	var res;
	var ta = type(a);
	var tb = type(b);

	if ( ta == "number" && tb != "number" )
		return isNotEqual(b,a);

	if( ta != "number" && tb == "number" ) {
		// vector/matrix + scalar
		switch( ta ) {
			case "vector":
				res = new Float64Array(a.length);
				for ( i=0; i<a.length; i++) {
					if ( !isZero( a[i] - b ) )
						res[i] = 1;
				}
				return res;
				break;
			case "matrix":
				res = new Matrix(a.m, a.n, isNotEqual(a.val, b), true );
				return res;
				break;
			default:
				return (a!=b?1:0);
		}
	}
	else if ( ta == tb ) {

		switch( ta ) {
			case "number":
				return ( !isZero(a - b)?1:0 );
				break;
			case "vector":
				res = new Float64Array(a.length);
				for ( i=0; i<a.length; i++) {
					if ( !isZero( get(a, i) - get(b,i) ) )
						res[i] = 1;
				}
				return res;
				break;
			case "matrix":
				res = new Matrix(a.m, a.n, isNotEqual(a.val, b.val), true );
				return res;
				break;
			default:
				return (a!=b?1:0);
		}
	}
	else
		return "undefined";
}

function isGreater( a, b) {
	var i;
	var j;
	var res;
	var ta = type(a);
	var tb = type(b);

	if ( ta == "number" && tb != "number" )
		return isGreater(b,a);

	if( ta != "number" && tb == "number" ) {
		// vector/matrix + scalar
		switch( ta ) {
			case "vector":
				res = new Float64Array(a.length);
				for ( i=0; i<a.length; i++) {
					if (  a[i] - b > EPS )
						res[i] = 1;
				}
				return res;
				break;
			case "matrix":
				res = new Matrix(a.m, a.n, isGreater(a.val, b), true );
				return res;
				break;
			default:
				return (a>b?1:0);
		}
	}
	else if (ta == tb) {

		switch( ta ) {
			case "number":
				return (a>b?1:0);
				break;
			case "vector":
				res = new Float64Array(a.length);
				for ( i=0; i<a.length; i++) {
					if (  a[i] - b[i] > EPS )
						res[i] = 1;
				}
				return res;
				break;
			case "matrix":
				res = new Matrix(a.m, a.n, isGreater(a.val, b.val), true );
				return res;
				break;
			default:
				return (a>b?1:0);
		}
	}
	else
		return "undefined";
}
function isGreaterOrEqual( a, b) {
	var i;
	var j;
	var res;
	var ta = type(a);
	var tb = type(b);

	if ( ta == "number" && tb != "number" )
		return isGreaterOrEqual(b,a);

	if( ta != "number" && tb == "number" ) {
		// vector/matrix + scalar
		switch( ta ) {
			case "vector":
				res = new Float64Array(a.length);
				for ( i=0; i<a.length; i++) {
					if (  a[i] - b > -EPS )
						res[i] = 1;
				}
				return res;
				break;
			case "matrix":
				res = new Matrix(a.m, a.n, isGreaterOrEqual(a.val, b), true );
				return res;
				break;
			default:
				return (a>=b?1:0);
		}
	}
	else if ( ta == tb ) {

		switch( ta ) {
			case "number":
				return (a>=b);
				break;
			case "vector":
				res = new Float64Array(a.length);
				for ( i=0; i<a.length; i++) {
					if ( a[i] - b[i] > -EPS )
						res[i] = 1;
				}
				return res;
				break;
			case "matrix":
				res = new Matrix(a.m, a.n, isGreaterOrEqual(a.val, b.val), true );
				return res;
				break;
			default:
				return (a>=b?1:0);
		}
	}
	else
		return "undefined";
}

function isLower( a, b) {
	var i;
	var j;
	var res;
	var ta = type(a);
	var tb = type(b);

	if ( ta == "number" && tb != "number" )
		return isLower(b,a);

	if( ta != "number" && tb == "number" ) {
		// vector/matrix + scalar
		switch( ta ) {
			case "vector":
				res = new Float64Array(a.length);
				for ( i=0; i<a.length; i++) {
					if (  b - a[i] > EPS )
						res[i] = 1;
				}
				return res;
				break;
			case "matrix":
				res = new Matrix(a.m, a.n, isLower(a.val, b), true );
				return res;
				break;
			default:
				return (a<b?1:0);
		}
	}
	else if ( ta == tb ) {

		switch( ta ) {
			case "number":
				return (a<b?1:0);
				break;
			case "vector":
				res = new Float64Array(a.length);
				for ( i=0; i<a.length; i++) {
					if (  b[i] - a[i] > EPS )
						res[i] = 1;
				}
				return res;
				break;
			case "matrix":
				res = new Matrix(a.m, a.n, isLower(a.val, b.val), true );
				return res;
				break;
			default:
				return (a<b?1:0);
		}
	}
	else
		return "undefined";
}
function isLowerOrEqual( a, b) {
	var i;
	var j;
	var res;

	var ta = type(a);
	var tb = type(b);

	if ( ta == "number" && tb != "number" )
		return isLowerOrEqual(b,a);

	if( ta != "number" && tb == "number" ) {
		// vector/matrix + scalar
		switch( ta ) {
			case "vector":
				res = new Float64Array(a.length);
				for ( i=0; i<a.length; i++) {
					if (  b - a[i] > -EPS )
						res[i] = 1;
				}
				return res;
				break;
			case "matrix":
				res = new Matrix(a.m, a.n, isLowerOrEqual(a.val, b), true );
				return res;
				break;
			default:
				return (a<=b?1:0);
		}
	}
	else if ( ta == tb ) {

		switch( ta ) {
			case "number":
				return (a<=b?1:0);
				break;
			case "vector":
				res = new Float64Array(a.length);
				for ( i=0; i<a.length; i++) {
					if ( b[i] - a[i] > -EPS )
						res[i] = 1;
				}
				return res;
				break;
			case "matrix":
				res = new Matrix(a.m, a.n, isLowerOrEqual(a.val, b.val) , true);
				return res;
				break;
			default:
				return (a<=b?1:0);
		}
	}
	else
		return "undefined";
}


function find( b ) {
	// b is a boolean vector of 0 and 1.
	// return the indexes of the 1's.
	var i;
	var n = b.length;
	var res = new Array();
	for ( i=0; i < n; i++) {
		if ( b[i] != 0 )
			res.push(i);
	}
	return res;
}
argmax = findmax;
function findmax( x ) {
	// return the index of the maximum in x
	var i;

	switch ( type(x)) {
	case "number":
		return 0;
		break;
	case "vector":
		var idx = 0;
		var maxi = x[0];
		for ( i= 1; i< x.length; i++) {
			if ( x[i] > maxi ) {
				maxi = x[i];
				idx = i;
			}
		}
		return idx;
		break;
	case "spvector":
		var maxi = x.val[0];
		var idx = x.ind[0];

		for ( i= 1; i< x.val.length; i++) {
			if ( x.val[i] > maxi ) {
				maxi = x.val[i];
				idx = x.ind[i];
			}
		}
		if ( maxi < 0 && x.val.length < x.length ) {
			idx = 0;
			while ( x.ind.indexOf(idx) >= 0 && idx < x.length)
				idx++;
		}
		return idx;
		break;
	default:
		return "undefined";
	}

}
argmin = findmin;
function findmin( x ) {
	// return the index of the minimum in x
	var i;

	switch ( type(x)) {
	case "number":
		return 0;
		break;
	case "vector":
		var idx = 0;
		var mini = x[0];
		for ( i= 1; i< x.length; i++) {
			if ( x[i] < mini ) {
				mini = x[i];
				idx = i;
			}
		}
		return idx;
		break;
	case "spvector":
		var mini = x.val[0];
		var idx = x.ind[0];

		for ( i= 1; i< x.val.length; i++) {
			if ( x.val[i] < mini ) {
				mini = x.val[i];
				idx = x.ind[i];
			}
		}
		if ( mini > 0 && x.val.length < x.length ) {
			idx = 0;
			while ( x.ind.indexOf(idx) >= 0 && idx < x.length)
				idx++;
		}
		return idx;
		break;
	default:
		return "undefined";
	}

}

/**
 * @param {Float64Array}
 * @param {boolean}
 * @param {boolean}
 * @return {Float64Array|Array}
 */
function sort( x, decreasingOrder , returnIndexes) {
	// if returnIndexes = true : replace x with its sorted version
	// otherwise return a sorted copy without altering x

	if ( typeof(decreasingOrder) == "undefined")
		var decreasingOrder = false;
	if ( typeof(returnIndexes) == "undefined")
		var returnIndexes = false;

	var i;
	var j;
	var tmp;

	const n = x.length;
	if ( returnIndexes ) {
		var indexes = range(n);
		for ( i=0; i < n - 1; i++) {
			if ( decreasingOrder )
				j = findmax( get ( x, range(i,n) ) ) + i ;
			else
				j = findmin( get ( x, range(i,n) ) ) + i;

			if ( i!=j) {
				tmp = x[i];
				x[i] = x[j];
				x[j] = tmp;

				tmp = indexes[i];
				indexes[i] = indexes[j];
				indexes[j] = tmp;
			}
		}
		return indexes;
	}
	else {
		var xs = vectorCopy(x);
		for ( i=0; i < n - 1; i++) {
			if ( decreasingOrder )
				j = findmax( get ( xs, range(i,n) ) ) + i;
			else
				j = findmin( get ( xs, range(i,n) ) ) + i;

			if ( i!=j) {
				tmp = xs[i];
				xs[i] = xs[j];
				xs[j] = tmp;
			}
		}
		return xs;
	}
}

/// Stats
/**
 * @param {Float64Array}
 * @return {number}
 */
function sumVector ( a ) {
	var i;
	const n = a.length;
	var res = a[0];
	for ( i=1; i< n; i++)
		res += a[i];
	return res;
}
/**
 * @param {Matrix}
 * @return {number}
 */
function sumMatrix ( A ) {
	return sumVector(A.val);
}
/**
 * @param {Matrix}
 * @return {Matrix}
 */
function sumMatrixRows( A ) {
	var i;
	var j;
	const m = A.m;
	const n = A.n;
	var res = new Float64Array(n);
	var r = 0;
	for ( i=0; i< m; i++) {
		for (j=0; j < n; j++)
			res[j] += A.val[r + j];
		r += n;
	}
	return new Matrix(1,n,res, true); // return row vector
}
/**
 * @param {Matrix}
 * @return {Float64Array}
 */
function sumMatrixCols( A ) {
	const m = A.m;
	var res = new Float64Array(m);
	var r = 0;
	for ( var i=0; i < m; i++) {
		for (var j=0; j < A.n; j++)
			res[i] += A.val[r + j];
		r += A.n;
	}
	return res;
}
function sum( A , sumalongdimension ) {

	switch ( type( A ) ) {
	case "vector":
		if ( arguments.length == 1 || sumalongdimension == 1 ) {
			return sumVector(A);
		}
		else {
			return vectorCopy(A);
		}
		break;
	case "spvector":
		if ( arguments.length == 1 || sumalongdimension == 1 )
			return sumVector(A.val);
		else
			return A.copy();
		break;

	case "matrix":
		if( arguments.length == 1  ) {
			return sumMatrix( A ) ;
		}
		else if ( sumalongdimension == 1 ) {
			return sumMatrixRows( A );
		}
		else if ( sumalongdimension == 2 ) {
			return sumMatrixCols( A );
		}
		else
			return undefined;
		break;
	case "spmatrix":
		if( arguments.length == 1  ) {
			return sumVector( A.val ) ;
		}
		else if ( sumalongdimension == 1 ) {
			return sumspMatrixRows( A );
		}
		else if ( sumalongdimension == 2 ) {
			return sumspMatrixCols( A );
		}
		else
			return undefined;
		break;
	default:
		return A;
		break;
	}
}
/**
 * @param {Float64Array}
 * @return {number}
 */
function prodVector ( a ) {
	var i;
	const n = a.length;
	var res = a[0];
	for ( i=1; i< n; i++)
		res *= a[i];
	return res;
}
/**
 * @param {Matrix}
 * @return {number}
 */
function prodMatrix ( A ) {
	return prodVector(A.val);
}
/**
 * @param {Matrix}
 * @return {Matrix}
 */
function prodMatrixRows( A ) {
	var i;
	var j;
	const m = A.m;
	const n = A.n;
	var res = new Float64Array(A.row(0));
	var r = n;
	for ( i=1; i< m; i++) {
		for (j=0; j < n; j++)
			res[j] *= A.val[r + j];
		r += A.n;
	}
	return new Matrix(1,n,res, true); // return row vector
}
/**
 * @param {Matrix}
 * @return {Float64Array}
 */
function prodMatrixCols( A ) {
	const m = A.m;
	var res = new Float64Array(m);
	var r = 0;
	for ( var i=0; i < m; i++) {
		res[i] = A.val[r];
		for (var j=1; j < A.n; j++)
			res[i] *= A.val[r + j];
		r += A.n;
	}
	return res;
}
function prod( A , prodalongdimension ) {

	switch ( type( A ) ) {
	case "vector":
		if ( arguments.length == 1 || prodalongdimension == 1 )
			return prodVector(A);
		else
			return vectorCopy(A);
		break;
	case "spvector":
		if ( arguments.length == 1 || prodalongdimension == 1 ) {
			if ( A.val.length < A.length )
				return 0;
			else
				return prodVector(A.val);
		}
		else
			return A.copy();
		break;
	case "matrix":
		if( arguments.length == 1  ) {
			return prodMatrix( A ) ;
		}
		else if ( prodalongdimension == 1 ) {
			return prodMatrixRows( A );
		}
		else if ( prodalongdimension == 2 ) {
			return prodMatrixCols( A );
		}
		else
			return undefined;
		break;
	case "spmatrix":
		if( arguments.length == 1  ) {
			if ( A.val.length < A.m * A.n )
				return 0;
			else
				return prodVector( A.val ) ;
		}
		else if ( prodalongdimension == 1 ) {
			return prodspMatrixRows( A );
		}
		else if ( prodalongdimension == 2 ) {
			return prodspMatrixCols( A );
		}
		else
			return undefined;
		break;
	default:
		return A;
		break;
	}
}

function mean( A , sumalongdimension ) {

	switch ( type( A ) ) {
	case "vector":
		if ( arguments.length == 1 || sumalongdimension == 1 ) {
			return sumVector(A) / A.length;
		}
		else {
			return vectorCopy(A);
		}
		break;
	case "spvector":
		if ( arguments.length == 1 || sumalongdimension == 1 )
			return sumVector(A.val) / A.length;
		else
			return A.copy();
		break;

	case "matrix":
		if( arguments.length == 1  ) {
			return sumMatrix( A ) / ( A.m * A.n);
		}
		else if ( sumalongdimension == 1 ) {
			return mulScalarMatrix( 1/A.m, sumMatrixRows( A ));
		}
		else if ( sumalongdimension == 2 ) {
			return mulScalarVector( 1/A.n, sumMatrixCols( A )) ;
		}
		else
			return undefined;
		break;
	case "spmatrix":
		if( arguments.length == 1  ) {
			return sumVector( A.val ) / ( A.m * A.n);
		}
		else if ( sumalongdimension == 1 ) {
			return mulScalarMatrix(1/A.m, sumspMatrixRows(A));
		}
		else if ( sumalongdimension == 2 ) {
			return mulScalarVector(1/A.n, sumspMatrixCols(A));
		}
		else
			return undefined;
		break;
	default:
		return A;
		break;
	}
}

function variance(A, alongdimension ) {
	// variance = sum(A^2)/n - mean(A)^2
	if ( arguments.length > 1 )
		var meanA = mean(A, alongdimension);
	else
		var meanA = mean(A);

	switch ( type( A ) ) {
	case "number":
		return 0;
		break;
	case "vector":
		if ( arguments.length == 1 || alongdimension == 1 ) {
			var res = ( dot(A,A) / A.length ) - meanA*meanA;
			return res ;
		}
		else {
			return zeros(A.length);
		}
		break;
	case "spvector":
		if ( arguments.length == 1 || alongdimension == 1 ) {
			var res = ( dot(A.val,A.val) / A.length ) - meanA*meanA;
			return res ;
		}
		else
			return zeros(A.length);

		break;

	case "matrix":
	case "spmatrix":
		if( typeof(alongdimension) == "undefined" ) {
			var res = (sum(entrywisemul(A,A)) / (A.m * A.n ) ) - meanA*meanA;
			return res;
		}
		else if ( alongdimension == 1 ) {
			// var of columns
			var res = sub( entrywisediv(sum(entrywisemul(A,A),1) , A.length ) , entrywisemul(meanA,meanA) );
			return res;
		}
		else if ( alongdimension == 2 ) {
			// sum all columns, result is column vector
			res = sub( entrywisediv(sum(entrywisemul(A,A),2) , A.n ) , entrywisemul(meanA,meanA) );
			return res;
		}
		else
			return undefined;
		break;
	default:
		return undefined;
	}
}

function std(A, alongdimension)  {
	if ( arguments.length > 1 )
		return sqrt(variance(A,alongdimension));
	else
		return sqrt(variance(A));
}

/**
 * Covariance matrix C = X'*X ./ X.m
 * @param {Matrix|Float64Array|spVector}
 * @return {Matrix|number}
 */
function cov( X ) {
	switch ( type( X ) ) {
	case "number":
		return 0;
		break;
	case "vector":
		var mu = mean(X);
		return ( dot(X,X) / X.length - mu*mu);
		break;
	case "spvector":
		var mu = mean(X);
		return ( dot(X.val,X.val) / X.length - mu*mu);
		break;
	case "matrix":
		var mu = mean(X,1).row(0);
		return divMatrixScalar(xtx( subMatrices(X, outerprod(ones(X.m), mu ) ) ), X.m);
		break;
	case "spmatrix":
		var mu = mean(X,1).row(0);
		return divMatrixScalar(xtx( subspMatrixMatrix(X, outerprod(ones(X.m), mu ) ) ), X.m);
		break;
	default:
		return undefined;
	}
}
/**
 * Compute X'*X
 * @param {Matrix}
 * @return {Matrix}
 */
function xtx( X ) {
	const N = X.m;
	const d = X.n;

	var C = new Matrix(d,d);
	for (var i=0; i < N; i++) {
		var xi= X.row(i);
		for(var k = 0; k < d; k++) {
			var xik = xi[k];
			for (var j=k; j < d; j++) {
				C.val[k*d + j] += xik * xi[j];
			}
		}
	}
	// Symmetric lower triangular part:
	for(var k = 0; k < d; k++) {
		var kd = k*d;
		for (var j=k; j < d; j++)
			C.val[j*d+k] = C.val[kd+j];
	}
	return C;
}

function norm( A , sumalongdimension ) {
	// l2-norm (Euclidean norm) of vectors or Frobenius norm of matrix
	var i;
	var j;
	switch ( type( A ) ) {
	case "number":
		return Math.abs(A);
		break;
	case "vector":
		if ( arguments.length == 1 || sumalongdimension == 1 ) {
			return Math.sqrt(dot(A,A));
		}
		else
			return abs(A);
		break;
	case "spvector":
		if ( arguments.length == 1 || sumalongdimension == 1 ) {
			return Math.sqrt(dot(A.val,A.val));
		}
		else
			return abs(A);
		break;
	case "matrix":
		if( arguments.length == 1 ) {
			return Math.sqrt(dot(A.val,A.val));
		}
		else if ( sumalongdimension == 1 ) {
			// norm of columns, result is row vector
			const n = A.n;
			var res = zeros(1, n);
			var r = 0;
			for (i=0; i< A.m; i++) {
				for(j=0; j<n; j++)
					res.val[j] += A.val[r+j]*A.val[r + j];
				r += n;
			}
			for(j=0;j<n; j++)
				res.val[j] = Math.sqrt(res.val[j]);
			return res;
		}
		else if ( sumalongdimension == 2 ) {
			// norm of rows, result is column vector
			var res = zeros(A.m);
			var r = 0;
			for ( i=0; i < A.m; i++) {
				for ( j=0; j < A.n; j++)
					res[i] += A.val[r + j] * A.val[r + j];
				r += A.n;
				res[i] = Math.sqrt(res[i]);
			}

			return res;
		}
		else
			return "undefined";
		break;
	case "spmatrix":
		if( arguments.length == 1 ) {
			return Math.sqrt(dot(A.val,A.val));
		}
		else if ( sumalongdimension == 1 && !A.rowmajor ) {
			// norm of columns, result is row vector
			const nn = A.n;
			var res = zeros(1, nn);
			for(j=0; j<nn; j++) {
				var s = A.cols[j];
				var e = A.cols[j+1];
				for ( var k=s; k < e; k++)
					res.val[j] += A.val[k]*A.val[k];
				res.val[j] = Math.sqrt(res.val[j]);
			}
			return res;
		}
		else if ( sumalongdimension == 2 && A.rowmajor ) {
			// norm of rows, result is column vector
			var res = zeros(A.m);
			for ( i=0; i < A.m; i++) {
				var s = A.rows[i];
				var e = A.rows[i+1];
				for ( var k=s; k < e; k++)
					res[i] += A.val[k] * A.val[k];
				res[i] = Math.sqrt(res[i]);
			}

			return res;
		}
		else
			return "undefined";
		break;
	default:
		return "undefined";
	}
}
function norm1( A , sumalongdimension ) {
	// l1-norm of vectors and matrices
	if ( arguments.length == 1 )
		return sum(abs(A));
	else
		return sum(abs(A), sumalongdimension);
}
function norminf( A , sumalongdimension ) {
	// linf-norm of vectors and max-norm of matrices
	if ( arguments.length == 1 )
		return max(abs(A));
	else
		return max(abs(A), sumalongdimension);
}
function normp( A , p, sumalongdimension ) {
	// lp-norm of vectors and matrices
	if ( arguments.length == 2 )
		return Math.pow( sum(pow(abs(A), p) ), 1/p);
	else
		return pow(sum(pow(abs(A), p), sumalongdimension), 1/p);
}

function normnuc( A ) {
	// nuclear norm
	switch( type(A) ) {
	case "matrix":
		return sumVector(svd(A));
		break;
	case "spmatrix":
		return sumVector(svd(fullMatrix(A)));
		break;
	case "number":
		return A;
		break;
	case "vector":
	case "spvector":
		return 1;
		break;
	default:
		return undefined;
		break;
	}
}
function norm0( A , sumalongdimension, epsilonarg ) {
	// l0-pseudo-norm of vectors and matrices
	// if epsilon > 0, consider values < epsilon as 0

	var epsilon = EPS;
	if ( arguments.length == 3 )
		epsilon = epsilonarg;

	var i;
	var j;
	switch ( type( A ) ) {
	case "number":
		return (Math.abs(A) > epsilon);
		break;
	case "vector":
		if ( arguments.length == 1 || sumalongdimension == 1 ) {
			return norm0Vector(A, epsilon);
		}
		else
			return isGreater(abs(a), epsilon);
		break;
	case "spvector":
		if ( arguments.length == 1 || sumalongdimension == 1 ) {
			return norm0Vector(A.val, epsilon);
		}
		else
			return isGreater(abs(a), epsilon);
		break;
	case "matrix":
		if( arguments.length == 1 ) {
			return norm0Vector(A.val, epsilon);
		}
		else if ( sumalongdimension == 1 ) {
			// norm of columns, result is row vector
			var res = zeros(1, A.n);
			for (i=0; i< A.m; i++) {
				for(j = 0; j < A.n; j++)
					if ( Math.abs(A[i*A.n + j]) > epsilon )
						res.val[j]++;
			}
			return res;
		}
		else if ( sumalongdimension == 2 ) {
			// norm of rows, result is column vector
			var res = zeros(A.m);
			for (i=0; i< A.m; i++) {
				for(j = 0; j < A.n; j++)
					if ( Math.abs(A[i*A.n + j]) > epsilon )
						res[i]++;
			}
			return res;
		}
		else
			return undefined;
		break;
	case "spmatrix":
		if( arguments.length == 1 ) {
			return norm0Vector(A.val, epsilon);
		}
		else if ( sumalongdimension == 1 ) {
			// norm of columns, result is row vector
			var res = zeros(1, A.n);
			if ( A.rowmajor ) {
				for ( var k=0; k < A.val.length; k++)
					if (Math.abs(A.val[k]) > epsilon)
						res.val[A.cols[k]] ++;
			}
			else {
				for ( var i=0; i<A.n; i++)
					res.val[i] = norm0Vector(A.col(i).val, epsilon);
			}
			return res;
		}
		else if ( sumalongdimension == 2 ) {
			// norm of rows, result is column vector
			var res = zeros(A.m);
			if ( A.rowmajor ) {
				for ( var i=0; i<A.m; i++)
					res[i] = norm0Vector(A.row(i).val, epsilon);
			}
			else {
				for ( var k=0; k < A.val.length; k++)
					if (Math.abs(A.val[k]) > epsilon)
						res[A.rows[k]]++;
			}
			return res;
		}
		else
			return undefined;
		break;
	default:
		return undefined;
	}
}
/**
 * @param {Float64Array}
 * @param {number}
 * @return {number}
 */
function norm0Vector( x, epsilon ) {
	const n = x.length;
	var res = 0;
	for (var i=0; i < n; i++)
		if ( Math.abs(x[i]) > epsilon )
			res++;
	return res;
}

///////////////////////////////////////////:
// Linear systems of equations
///////////////////////////////////////

function solve( A, b ) {
	/* Solve the linear system Ax = b	*/

	var tA = type(A);

	if ( tA == "vector" || tA == "spvector" || (tA == "matrix" && A.m == 1) ) {
		// One-dimensional least squares problem:
		var AtA = mul(transpose(A),A);
		var Atb = mul(transpose(A), b);
		return Atb / AtA;
	}

	if ( tA == "spmatrix" ) {
		/*if ( A.m == A.n )
			return spsolvecg(A, b); // assume A is positive definite
		else*/
		return spcgnr(A, b);
	}

	if( type(b) == "vector" ) {
		if ( A.m == A.n )
			return solveGaussianElimination(A, b) ;
		else
			return solveWithQRcolumnpivoting(A, b) ;
	}
	else
		return solveWithQRcolumnpivotingMultipleRHS(A, b) ; // b is a matrix
}
/**
 * Solve the linear system Ax = b given the Cholesky factor L of A
 * @param {Matrix}
 * @param {Float64Array}
 * @return {Float64Array}
 */
function cholsolve ( L, b ) {
	var z = forwardsubstitution(L, b);
	var x = backsubstitution(transposeMatrix(L), z);
	return x;
}

/**
 * @param {Matrix}
 * @param {Float64Array}
 * @return {Float64Array}
 */
function solveWithQRfactorization ( A, b ) {
	const m = A.length;
	const n = A.n;
	var QRfact = qr(A);
	var R = QRfact.R;
	var beta = QRfact.beta;

	var btmp = vectorCopy(b);
	var j;
	var i;
	var k;
	var v;

	var smallb;

	for (j=0;j<n-1; j++) {
		v = get(R, range(j,m), j) ; // get Householder vectors
		v[0] = 1;
		// b(j:m) = (I - beta v v^T ) * b(j:m)
		smallb = get(btmp, range(j,m) );
		set ( btmp, range(j,m), sub ( smallb , mul( beta[j] * mul( v, smallb) , v ) ) );
	}
	// last iteration only if m>n
	if ( m > n ) {
		j = n-1;

		v = get(R, range(j,m), j) ; // get Householder vectors
		v[0] = 1;
		// b(j:m) = (I - beta v v^T ) * b(j:m)
		smallb = get(btmp, range(j,m) );
		set ( btmp, range(j,m), sub ( smallb , mul( beta[j] * mul( v, smallb) , v ) ) );

	}

	// Solve R x = b with backsubstitution (R is upper triangular, well it is not really here because we use the lower part to store the vectors v):
	return backsubstitution ( R , get ( btmp, range(n)) );


//	return backsubstitution ( get ( R, range(n), range(n) ) , rows ( btmp, range(1,n)) );
//	we can spare the get and copy of R : backsubstitution will only use this part anyway
}

/**
 * @param {Matrix}
 * @param {Float64Array}
 * @return {Float64Array}
 */
function backsubstitution ( U, b ) {
	// backsubstitution to solve a linear system U x = b with upper triangular U

	const n = b.length;
	var j = n-1;
	var x = zeros(n);

	if ( ! isZero(U.val[j*n+j]) )
		x[j] = b[j] / U.val[j*n+j];

	j = n-2;
	if ( !isZero(U.val[j*n+j]) )
		x[j] = ( b[j] - U.val[j*n+n-1] * x[n-1] ) / U.val[j*n+j];

	for ( j=n-3; j >= 0 ; j-- ) {
		if ( ! isZero(U.val[j*n+j]) )
			x[j] = ( b[j] - dot( U.row(j).subarray(j+1,n) , x.subarray(j+1,n) ) ) / U.val[j*n+j];
	}

	// solution
	return x;
}
/**
 * @param {Matrix}
 * @param {Float64Array}
 * @return {Float64Array}
 */
function forwardsubstitution ( L, b ) {
	// forward substitution to solve a linear system L x = b with lower triangular L

	const n = b.length;
	var j;
	var x = zeros(n);

	if ( !isZero(L.val[0]) )
		x[0] = b[0] / L.val[0];

	if ( ! isZero(L.val[n+1]) )
		x[1] = ( b[1] - L.val[n] * x[0] ) / L.val[n+1];

	for ( j=2; j < n ; j++ ) {
		if ( ! isZero(L.val[j*n+j]) )
			x[j] = ( b[j] - dot( L.row(j).subarray(0,j) , x.subarray(0,j) ) ) / L.val[j*n+j];
	}

	// solution
	return x;
}
/**
 * @param {Matrix}
 * @param {Float64Array}
 * @return {Float64Array}
 */
function solveWithQRcolumnpivoting ( A, b ) {

	var m;
	var n;
	var R;
	var V;
	var beta;
	var r;
	var piv;
	if ( type( A ) == "matrix" ) {
		// Compute the QR factorization
		m = A.m;
		n = A.n;
		var QRfact = qr(A);
		R = QRfact.R;
		V = QRfact.V;
		beta = QRfact.beta;
		r = QRfact.rank;
		piv = QRfact.piv;
	}
	else {
		// we get the QR factorization in A
		R = A.R;
		r = A.rank;
		V = A.V;
		beta = A.beta;
		piv = A.piv;
		m = R.m;
		n = R.n;
	}

	var btmp = vectorCopy(b);
	var j;
	var i;
	var k;

	var smallb;
	// b = Q' * b
	for (j=0;j < r; j++) {

		// b(j:m) = (I - beta v v^T ) * b(j:m)
		smallb = get(btmp, range(j,m) );

		set ( btmp, range(j,m), sub ( smallb , mul( beta[j] * mul( V[j], smallb) , V[j] ) ) );
	}
	// Solve R x = b with backsubstitution
	var x = zeros(n);

	if ( r > 1 ) {
		set ( x, range(0,r), backsubstitution ( R , get ( btmp, range(r)) ) );
		// note: if m < n, backsubstitution only uses n columns of R.
	}
	else {
		x[0] = btmp[0] / R.val[0];
	}

	// and apply permutations
	for ( j=r-1; j>=0; j--) {
		if ( piv[j] != j ) {
			var tmp = x[j] ;
			x[j] = x[piv[j]];
			x[piv[j]] = tmp;
		}
	}
	return x;

}
/**
 * @param {Matrix}
 * @param {Matrix}
 * @return {Matrix}
 */
function solveWithQRcolumnpivotingMultipleRHS ( A, B ) {

	var m;
	var n;
	var R;
	var V;
	var beta;
	var r;
	var piv;
	if ( type( A ) == "matrix" ) {
		// Compute the QR factorization
		m = A.m;
		n = A.n;
		var QRfact = qr(A);
		R = QRfact.R;
		V = QRfact.V;
		beta = QRfact.beta;
		r = QRfact.rank;
		piv = QRfact.piv;
	}
	else {
		// we get the QR factorization in A
		R = A.R;
		r = A.rank;
		V = A.V;
		beta = A.beta;
		piv = A.piv;
		m = R.m;
		n = R.n;
	}

	var btmp = matrixCopy(B);
	var j;
	var i;
	var k;

	var smallb;
	// B = Q' * B
	for (j=0;j < r; j++) {

		// b(j:m) = (I - beta v v^T ) * b(j:m)
		smallb = get(btmp, range(j,m), [] );

		set ( btmp, range(j,m), [], sub ( smallb , mul(mul( beta[j], V[j]), mul( transpose(V[j]), smallb) ) ) );
	}
	// Solve R X = B with backsubstitution
	var X = zeros(n,m);

	if ( r > 1 ) {
		for ( j=0; j < m; j++)
			set ( X, range(0,r), j, backsubstitution ( R , get ( btmp, range(r), j) ) );
		// note: if m < n, backsubstitution only uses n columns of R.
	}
	else {
		set(X, 0, [], entrywisediv(get(btmp, 0, []) , R.val[0]) );
	}

	// and apply permutations
	for ( j=r-1; j>=0; j--) {
		if ( piv[j] != j ) {
			swaprows(X, j, piv[j]);
		}
	}
	return X;

}

function solveGaussianElimination(Aorig, borig) {

	// Solve square linear system Ax = b with Gaussian elimination

	var i;
	var j;
	var k;

	var A = matrixCopy( Aorig ).toArrayOfFloat64Array(); // useful to quickly switch rows
	var b = vectorCopy( borig );

	const m = Aorig.m;
	const n = Aorig.n;
	if ( m != n)
		return undefined;

	// Set to zero small values... ??

	for (k=0; k < m ; k++) {

		// Find imax = argmax_i=k...m |A_i,k|
		var imax = k;
		var Aimaxk = Math.abs(A[imax][k]);
		for (i=k+1; i<m ; i++) {
			var Aik = Math.abs( A[i][k] );
			if ( Aik > Aimaxk ) {
				imax = i;
				Aimaxk = Aik;
			}
		}
		if ( isZero( Aimaxk ) ) {
			console.log("** Warning in solve(A,b), A is square but singular, switching from Gaussian elimination to QR method.");
			return solveWithQRcolumnpivoting(A,b);
		}

		if ( imax != k ) {
			// Permute the rows
			var a = A[k];
			A[k] = A[imax];
			A[imax] = a;
			var tmpb = b[k];
			b[k] = b[imax];
			b[imax] = tmpb;
		}
		var Ak = A[k];

		// Normalize row k
		var Akk = Ak[k];
		b[k] /= Akk;

		//Ak[k] = 1; // not used afterwards
		for ( j=k+1; j < n; j++)
			Ak[j] /= Akk;

		if ( Math.abs(Akk) < 1e-8 ) {
			console.log("** Warning in solveGaussianElimination: " + Akk + " " + k + ":" + m );
		}

		// Substract the kth row from others to get 0s in kth column
		var Aik ;
		var bk = b[k];
		for ( i=0; i< m; i++) {
			if ( i != k ) {
				var Ai = A[i];
				Aik = Ai[k];
				for ( j=k+1; j < n; j++) { // Aij = 0  with j < k and Aik = 0 after this operation but is never used
					Ai[j] -= Aik * Ak[j];
				}
				b[i] -= Aik * bk;
			}
		}
	}

	// Solution:
	return b;
}

function inv( M ) {
	if ( typeof(M) == "number" )
		return 1/M;

	// inverse matrix with Gaussian elimination

	var i;
	var j;
	var k;
	const m = M.length;
	const n = M.n;
	if ( m != n)
		return "undefined";

	// Make extended linear system:
	var A = matrixCopy(M) ;
	var B = eye(n);

	for (k=0; k < m ; k++) {
		var kn = k*n;

		// Find imax = argmax_i=k...m |A_i,k|
		var imax = k;
		var Aimaxk = Math.abs(A.val[imax*n + k]);
		for (i=k+1; i<m ; i++) {
			if ( Math.abs( A.val[i*n + k] ) > Aimaxk ) {
				imax = i;
				Aimaxk = Math.abs(A.val[i * n + k]);
			}
		}
		if ( Math.abs( Aimaxk ) < 1e-12 ) {
			return "singular";
		}

		if ( imax != k ) {
			// Permute the rows
			swaprows(A, k, imax);
			swaprows(B,k, imax);
		}

		// Normalize row k
		var Akk = A.val[kn + k];
		for ( j=0; j < n; j++) {
			A.val[kn + j] /= Akk;
			B.val[kn + j] /= Akk;
		}

		if ( Math.abs(Akk) < 1e-8 )
			console.log("!! Warning in inv(): " + Akk + " " + k + ":" + m );

		// Substract the kth row from others to get 0s in kth column
		var Aik ;
		for ( i=0; i< m; i++) {
			if ( i != k ) {
				var ri = i*n;
				Aik = A.val[ri+k];
				if ( ! isZero(Aik) ) {
					for ( j=0; j < n; j++) {
						A.val[ri + j] -= Aik * A.val[kn+j];
						B.val[ri + j] -= Aik * B.val[kn+j] ;
					}
				}
			}
		}
	}

	// Solution:
	return B;
}

function chol( A ) {
	// Compute the Cholesky factorization A = L L^T with L lower triangular
	// for a positive definite and symmetric A
	// returns L or undefined if A is not positive definite
	const n = A.m;
	if ( A.n != n) {
		error("Cannot compute the cholesky factorization: the matrix is not square.");
		return undefined;
	}
	const n2= n*n;
	const Aval = A.val;
	var L = new Float64Array(n2);

	var i,j;
	// first column = A(:,0) / sqrt(L(0,0)
	var sqrtLjj = Math.sqrt(Aval[0]);
	for ( i=0; i < n2 ; i+=n) { 	// i = i*n = ptr to row i
		L[i] = Aval[i] / sqrtLjj;
	}
	// other colums
	j = 1;
	var jn = n;
	while ( j < n && !isNaN(sqrtLjj)) {
		for ( i = jn; i < n2; i+=n ) {	// i = i*n
			var Lij = Aval[i+j];
			for ( var k=0; k < j; k++) {
				Lij -= L[jn + k] * L[i + k];
			}
			if (i == jn)
				sqrtLjj = Math.sqrt(Lij);

			L[i +j] = Lij / sqrtLjj;
		}
		j++;
		jn += n;
	}
	if ( isNaN(sqrtLjj) )
		return undefined; // not positive definite
	else
		return new Matrix(n,n,L,true);
}

function ldlsymmetricpivoting ( Aorig ) {
	// LDL factorization for symmetric matrices
	var A = matrixCopy( Aorig );
	var n = A.length;
	if ( A.m != n ) {
		error("Error in ldl(): the matrix is not square.");
		return undefined;
	}
	var k;
	var piv = zeros(n);
	var alpha;
	var v;

	for ( k=0; k < n-1; k++) {

		piv[k] = findmax(get(diag(A ), range(k,n) ));
		swaprows(A, k, piv[k] );
		swapcols(A, k, piv[k] );
		alpha = A.val[k*n + k];
		v = getCols ( A, [k]).subarray(k+1,n);

		for ( var i=k+1;i < n; i++)
			A.val[i*n + k] /= alpha;

		set( A, range(k+1,n),range(k+1,n), sub (get(A,range(k+1,n), range(k+1,n)), outerprod(v,v, 1/alpha)));

	}

	// Make it lower triangular
	for (var j=0; j < n-1; j++) {
		for (var k=j+1; k < n ; k++)
			A.val[j*n + k] = 0;
	}
	return {L: A, piv: piv};
}
/**
 * @param {Float64Array}
 * @return {{v: Float64Array, beta: number}}
 */
function house ( x ) {
	// Compute Houselholder vector v such that
	// P = (I - beta v v') is orthogonal and Px = ||x|| e_1

	const n = x.length;
	var i;
	var mu;
	var beta;
	var v = zeros(n);
	var v0;
	var sigma ;

	var x0 = x[0];
	var xx = dot(x,x);

	// sigma = x(2:n)^T x(2:n)
	sigma = xx -x0*x0;

	if ( isZero( sigma ) ) {
		// x(2:n) is zero =>  v=[1,0...0], beta = 0
		beta = 0;
		v[0] = 1;
	}
	else {
		mu = Math.sqrt(xx); // norm(x) ; //Math.sqrt( x0*x0 + sigma );
		if ( x0 < EPS ) {
			v0 = x0 - mu;
		}
		else {
			v0 = -sigma / (x0 + mu);
		}

		beta = 2 * v0 * v0 / (sigma + v0 * v0 );

		// v = [v0,x(2:n)] / v0
		v[0] = 1;
		for ( i=1; i< n; i++)
			v[i] = x[i] / v0;
	}

	return { "v" : v , "beta" : beta};
}
/**
 * @param {Matrix}
 * @return {{Q: (Matrix|undefined), R: Matrix, beta: Float64Array}
 */
function qroriginal( A, compute_Q ) {
	// QR factorization based on Householder reflections WITHOUT column pivoting
	// A with m rows and n cols; m >= n

	// test with A = [[12,-51,4],[6,167,-68],[-4,24,-41]]
	// then R = [ [14 -21 -14 ], [ -3, 175, -70], [2, -0.75, 35]]

	var m = A.length;
	var n = A.n;
	if ( n > m)
		return "QR factorization unavailable for n > m.";

	var i;
	var j;
	var k;
	var householder;
	var R = matrixCopy(A);
	var beta = zeros(n);
	var outer;
	var smallR;
	var Q;
	var V = new Array(); // store householder vectors


	for ( j=0; j < n - 1 ; j++) {
		householder = house( get( R, range(j,m), j) );
		// R(j:m,j:n) = ( I - beta v v' ) * R(j:m,j:n) = R - (beta v) (v'R)
		smallR =  get(R, range(j,m), range(j,n) );
		set ( R, range(j,m), range(j,n) , subMatrices (  smallR , outerprodVectors( householder.v, mulMatrixVector( transposeMatrix(smallR), householder.v) ,  householder.beta ) ) ) ;

		 V[j] = householder.v;
		 beta[j] = householder.beta;

	}
	// Last iteration only if m > n: if m=n, (I - beta v v' ) = 1 => R(n,n) is unchanged
	if ( m > n ) {
		j = n-1;
		smallR = get( R, range(j,m), j)
		householder = house( smallR );
		 // R(j:m,n) = ( I - beta v v' ) * R(j:m, n) = R(j:m,n) - (beta v) (v'R(j:m,n) ) = Rn - ( beta *(v' * Rn) )* v
		set ( R, range(j,m), n-1 , subVectors (  smallR , mulScalarVector( dot( householder.v, smallR ) *  householder.beta, householder.v  ) ) ) ;

	 	V[j] = vectorCopy(householder.v);
		beta[j] = householder.beta;

	}

	if ( compute_Q ) {
		var r;
		if ( typeof( compute_Q ) == "number") {
			// compute only first r columns of Q
			r = compute_Q;
			Q = eye(m,r);
		}
		else {
			Q = eye(m);
			r = m;
		}
		var smallQ;
		var nmax = n-1;
		if ( m<=n)
			nmax = n-2;
		if ( nmax >= r )
			nmax = r-1;

		for ( j=nmax; j >=0; j--) {
			smallQ =  get(Q, range(j,m), range(j,r) );

			if ( r > 1 ) {
				if ( j == r-1)
					set ( Q, range(j,m), [j] , subVectors (  smallQ ,  mulScalarVector( dot( smallQ, V[j]) * beta[j],  V[j] ) ) );
				else
					set ( Q, range(j,m), range(j,r), sub (  smallQ , outerprod( V[j], mul( transpose( smallQ), V[j]), beta[j] ) ) );
			}
			else
				Q = subVectors (  smallQ , mulScalarVector( dot( smallQ, V[j]) * beta[j],  V[j] ) );
		}
	}

	return {"Q" : Q, "R" : R, "beta" : beta };
}

/**
 * @param {Matrix}
 * @return {{Q: (Matrix|undefined), R: Matrix, V: Array, beta: Float64Array, piv: Float64Array, rank: number}
 */
function qr( A, compute_Q ) {
	// QR factorization with column pivoting AP = QR based on Householder reflections
	// A with m rows and n cols; m >= n (well, it also works with m < n)
	// piv = vector of permutations : P = P_rank with P_j = identity with swaprows ( j, piv(j) )

	// Implemented with R transposed for faster computations on rows instead of columns

	/* TEST
	A  = [[12,-51,4],[6,167,-68],[-4,24,-41]]
	QR = qr(A)
	QR.R


	*/
	const m = A.m;
	const n = A.n;

	/*
	if ( n > m)
		return "QR factorization unavailable for n > m.";
	*/

	var i;
	var j;

	var householder;
	var R = transpose(A);// transposed for faster implementation
	var Q;

	var V = new Array(); // store householder vectors in this list (not a matrix)
	var beta = zeros(n);
	var piv = zeros(n);

	var smallR;

	var r = -1; // rank estimate -1

	var normA = norm(A);
	var normR22 = normA;
	var Rij;

	const TOL = 1e-5;
	var TOLnormR22square = TOL * normA;
	TOLnormR22square *= TOLnormR22square;

	var tau = 0;
	var k = 0;
	var c = zeros (n);
	for ( j=0; j < n ; j++) {
		var Rj = R.val.subarray(j*R.n,j*R.n + R.n);
		c[j] = dot(Rj,Rj);
		if ( c[j] > tau ) {
			tau = c[j];
			k = j;
		}
	}

	var updateR = function (r, v, beta) {
		// set ( R, range(r,n), range(r,m) , subMatrices (  smallR , outerprodVectors( mulMatrixVector( smallR, householder.v), householder.v,  householder.beta ) ) ) ;
		// most of the time is spent here...
		var i,j,l;
		var m_r = m-r;
		for ( i=r; i < n; i++) {
			var smallRiv = 0;
			var Ri = i*m + r; // =  i * R.n + r
			var Rval = R.val.subarray(Ri,Ri+m_r);
			for ( l = 0 ; l < m_r ; l ++)
				smallRiv += Rval[l] * v[l];	//smallRiv += R.val[Ri + l] * v[l];
			smallRiv *= beta ;
			for ( j=0; j < m_r ; j ++) {
				Rval[j] -= smallRiv * v[j]; // R.val[Ri + j] -= smallRiv * v[j];
			}
		}
	};

	// Update c
	var updateC = function(r) {
		var j;
		for (j=r+1; j < n; j++) {
			var Rjr = R.val[j*m + r];
			c[j] -= Rjr * Rjr;
		}

		// tau, k = max ( c[r+1 : n] )
		k=r+1;
		tau = c[r+1];
		for ( j=r+2; j<n;j++) {
			if ( c[j] > tau ) {
				tau = c[j];
				k = j;
			}
		}
	};

	// Compute norm of residuals
	var computeNormR22 = function(r) {
		//normR22 = norm(get ( R, range(r+1,n), range(r+1,m), ) );
		var normR22 = 0;
		var i = r+1;
		var ri = i*m;
		var j;
		while ( i < n && normR22 <= TOLnormR22square ) {
			for ( j=r+1; j < m; j++) {
				var Rij = R.val[ri + j];
				normR22 += Rij*Rij;
			}
			i++;
			ri += m;
		}
		return normR22;
	}


	while ( tau > EPS  && r < n-1 &&  normR22 > TOLnormR22square ) {

		r++;

		piv[r] = k;
		swaprows ( R, r, k);
		c[k] = c[r];
		c[r] = tau;

		if ( r < m-1) {
			householder = house( R.val.subarray(r*R.n + r,r*R.n + m) ); // house only reads vec so subarray is ok
		}
		else {
			householder.v = [1];
			householder.beta = 0;
			//smallR = R[m-1][m-1];
		}

		if (r < n-1) {
			// smallR is a matrix
			updateR(r, householder.v, householder.beta);
		}
		else {
			// smallR is a row vector (or a number if m=n):
			if ( r < m-1) {
				updateR(r, householder.v, householder.beta);
			/*
				var r_to_m = range(r,m);
				smallR = get(R, r, r_to_m);
				set ( R, r , r_to_m, sub (  smallR , transpose(mul( householder.beta * mul( smallR, householder.v) ,householder.v  ) )) ) ;*/
			}
			else {
				//var smallRnumber = R.val[(m-1)*R.n + m-1]; // beta is zero, so no update
				//set ( R, r , r, sub (  smallRnumber , transpose(mul( householder.beta * mul( smallRnumber, householder.v) ,householder.v  ) )) ) ;
			}
		}

		// Store householder vectors and beta
		V[r] = vectorCopy( householder.v );
		beta[r] = householder.beta;

		if ( r<n-1 ) {
			// Update c
			updateC(r);

			// stopping criterion for rank estimation
			if ( r < m-1 )
				normR22 = computeNormR22(r);
			else
				normR22 = 0;
		}
	}

	if ( compute_Q ) {
		Q = eye(m);
		var smallQ;
		var nmax = r;
		if ( m > r+1)
			nmax = r-1;
		for ( j=nmax; j >=0; j--) {
			if ( j == m-1 ) {
				Q.val[j*m+j] -=  beta[j] * V[j][0] * V[j][0] * Q.val[j*m+j];
			}
			else {
				var j_to_m = range(j,m);
				smallQ =  get(Q, j_to_m, j_to_m );// matrix
				set ( Q, j_to_m, j_to_m, subMatrices (  smallQ , outerprodVectors(  V[j], mulMatrixVector( transposeMatrix(smallQ), V[j]), beta[j] ) ) );
			}
		}
	}

	return {"Q" : Q, "R" : transpose(R), "V": V, "beta" : beta, "piv" : piv, "rank" : r+1 };
}

function qrRnotTransposed( A, compute_Q ) {
	// QR factorization with column pivoting AP = QR based on Householder reflections
	// A with m rows and n cols; m >= n (well, it also works with m < n)
	// piv = vector of permutations : P = P_rank with P_j = identity with swaprows ( j, piv(j) )

	// original implementation working on columns

	/* TEST
	A  = [[12,-51,4],[6,167,-68],[-4,24,-41]]
	QR = qr(A)
	QR.R


	*/
	var m = A.m;
	var n = A.n;

	/*
	if ( n > m)
		return "QR factorization unavailable for n > m.";
	*/

	var i;
	var j;

	var householder;
	var R = matrixCopy(A);
	var Q;

	var V = new Array(); // store householder vectors in this list (not a matrix)
	var beta = zeros(n);
	var piv = zeros(n);

	var smallR;

	var r = -1; // rank estimate -1

	var normA = norm(A);
	var normR22 = normA;

	var TOL = 1e-6;

	var tau = 0;
	var k = 0;
	var c = zeros (n);
	for ( j=0; j < n ; j++) {
		var Aj = getCols ( A, [j]);
		c[j] = dot(Aj, Aj);
		if ( c[j] > tau ) {
			tau = c[j];
			k = j;
		}
	}

	while ( tau > EPS  && r < n-1 &&  normR22 > TOL * normA ) {

		r++;

		piv[r] = k;
		swapcols ( R, r, k);
		c[k] = c[r];
		c[r] = tau;

		if ( r < m-1) {
			householder = house( get( R, range(r,m), r) );
			smallR = get(R, range(r,m), range(r,n) );
		}
		else {
			householder.v = [1];
			householder.beta = 0;
			smallR = R[m-1][m-1];
		}

		if (r < n-1) {
			// smallR is a matrix
			set ( R, range(r,m), range(r,n) , subMatrices (  smallR , outerprodVectors( householder.v, mulMatrixVector( transposeMatrix(smallR), householder.v) ,  householder.beta ) ) ) ;
		}
		else {
			// smallR is a vector (or a number if m=n):
			set ( R, range(r,m), r , sub (  smallR , mul( householder.beta * mul( smallR, householder.v) ,householder.v  ) ) ) ;
		}

		// Store householder vectors and beta
		if ( m > r+1 )
			V[r] = vectorCopy( householder.v );
		beta[r] = householder.beta;

		if ( r<n-1 ) {
			// Update c
			for ( j=r+1; j < n; j++) {
				c[j] -= R[r][j] * R[r][j];
			}

			// tau, k = max ( c[r+1 : n] )
			k=r+1;
			tau = c[r+1];
			for ( j=r+2; j<n;j++) {
				if ( c[j] > tau ) {
					tau = c[j];
					k = j;
				}
			}

			// stopping criterion for rank estimation
			if ( r < m-1 ) {
				//normR22 = norm(get ( R, range(r+1,m),range(r+1,n) ) );
				normR22 = 0;
				for ( i=r+1; i < m; i++) {
					for ( j=r+1; j < n; j++) {
						Rij = R[i][j];
						normR22 += Rij*Rij;
					}
				}
				normR22 = Math.sqrt(normR22);
			}
			else
				normR22 = 0;
		}
	}

	if ( compute_Q ) {
		Q = eye(m);
		var smallQ;
		var nmax = r;
		if ( m>r+1)
			nmax = r-1;
		for ( j=nmax; j >=0; j--) {
			if ( j == m-1 ) {
				Q.val[j*m+j] -=  beta[j] * V[j][0] * V[j][0] * Q.val[j*m+j];
			}
			else {
				smallQ =  get(Q, range(j,m), range(j,m) );
				set ( Q, range(j,m), range(j,m) , subMatrices (  smallQ , outerprodVectors(  V[j], mulMatrixVector( transposeMatrix(smallQ), V[j]), beta[j] ) ) );
			}
		}

	}

	return {"Q" : Q, "R" : R, "V": V, "beta" : beta, "piv" : piv, "rank" : r+1 };
}

/** Conjugate gradient method for solving the symmetyric positive definite system Ax = b
 * @param{{Matrix|spMatrix}}
 * @param{Float64Array}
 * @return{Float64Array}
 */
function solvecg ( A, b) {
	if( A.type == "spmatrix" )
		return spsolvecg(A,b);
	else
		return solvecgdense(A,b);
}

/** Conjugate gradient method for solving the symmetyric positive definite system Ax = b
 * @param{Matrix}
 * @param{Float64Array}
 * @return{Float64Array}
 */
function solvecgdense ( A, b) {
/*
TEST
A = randn(2000,1000)
x = randn(1000)
b = A*x + 0.01*randn(2000)
tic()
xx = solve(A,b)
t1 = toc()
ee = norm(A*xx - b)
tic()
xh=solvecg(A'*A, A'*b)
t2 = toc()
e = norm(A*xh - b)
*/

	const n = A.n;
	const m = A.m;

	var x = randn(n); //vectorCopy(x0);
	var r = subVectors(b, mulMatrixVector(A, x));
	var rhoc = dot(r,r);
	const TOL = 1e-8;
	var delta2 = TOL * norm(b);
	delta2 *= delta2;

	// first iteration:
	var p = vectorCopy(r);
	var w = mulMatrixVector(A,p);
	var mu = rhoc / dot(p, w);
	saxpy( mu, p, x);
	saxpy( -mu, w, r);
	var rho_ = rhoc;
	rhoc = dot(r,r);

	var k = 1;

	var updateP = function (tau, r) {
		for ( var i=0; i < m; i++)
			p[i] = r[i] + tau * p[i];
	}

	while ( rhoc > delta2 && k < n ) {
		updateP(rhoc/rho_, r);
		w = mulMatrixVector(A,p);
		mu = rhoc / dot(p, w);
		saxpy( mu, p, x);
		saxpy( -mu, w, r);
		rho_ = rhoc;
		rhoc = dot(r,r);
		k++;
	}
	return x;
}
/** Conjugate gradient normal equation residual method for solving the rectangular system Ax = b
 * @param{{Matrix|spMatrix}}
 * @param{Float64Array}
 * @return{Float64Array}
 */
function cgnr ( A, b) {
	if( A.type == "spmatrix" )
		return spcgnr(A,b);
	else
		return cgnrdense(A,b);
}
/** Conjugate gradient normal equation residual method for solving the rectangular system Ax = b
 * @param{Matrix}
 * @param{Float64Array}
 * @return{Float64Array}
 */
function cgnrdense ( A, b) {
/*
TEST
A = randn(2000,1000)
x = randn(1000)
b = A*x + 0.01*randn(2000)
tic()
xx = solve(A,b)
t1 = toc()
ee = norm(A*xx - b)
tic()
xh=cgnr(A, b)
t2 = toc()
e = norm(A*xh - b)
*/

	const n = A.n;
	const m = A.m;

	var x = randn(n); // vectorCopy(x0);
	var At = transposeMatrix(A);
	var r = subVectors(b, mulMatrixVector(A, x));
	const TOL = 1e-8;
	var delta2 = TOL * norm(b);
	delta2 *= delta2;

	// first iteration:
	var z = mulMatrixVector(At, r);
	var rhoc = dot(z,z);
	var p = vectorCopy(z);
	var w = mulMatrixVector(A,p);
	var mu = rhoc / dot(w, w);
	saxpy( mu, p, x);
	saxpy( -mu, w, r);
	z = mulMatrixVector(At, r);
	var rho_ = rhoc;
	rhoc = dot(z,z);

	var k = 1;

	var updateP = function (tau, z) {
		for ( var i=0; i < m; i++)
			p[i] = z[i] + tau * p[i];
	}

	while ( rhoc > delta2 && k < n ) {
		updateP(rhoc/rho_, z);
		w = mulMatrixVector(A,p);
		mu = rhoc / dot(w, w);
		saxpy( mu, p, x);
		saxpy( -mu, w, r);
		z = mulMatrixVector(At, r);
		rho_ = rhoc;
		rhoc = dot(z,z);
		k++;
	}
	return x;
}

/** Lanczos algorithm
 * @param{Matrix}
 */
function lanczos ( A, q1 ) {

	const maxIters = 300;
	const TOL = EPS * norm(A);
	const n = A.n;
	var i;
	var k = 0;
	var w = vectorCopy(q1);
	var v = mulMatrixVector(A, w);
	var alpha = dot(w,v);
	saxpy(-alpha, w, v);
	beta = norm(b);

	while ( beta > TOL && k < maxIters ) {

		for ( i=0; i < n; i++) {
			var t = w[i];
			w[i] = v[i] / beta;
			v[i] = -beta / t;
		}

		var Aw = mulMatrixVector(A,w);

		for ( i=0; i < n; i++)
			v[i] += Aw[i];

		alpha = dot(w,v);
		saxpy(-alpha,w,v);
		beta = norm(v);
		k++;
	}
}

/**
 * @param{Matrix}
 * @param{boolean}
 * @return{Matrix}
 */
function tridiagonalize( A, returnQ ) {
	// A : a square and symmetric  matrix
	// T = Q A Q' , where T is tridiagonal and Q = (H1 ... Hn-2)' is the product of Householder transformations.
	// if returnQ, then T overwrites A
	var k;
	const n = A.length;
	var T;
	var Q;
	var Pk;
	if ( returnQ ) {
		T = A;
		Q = eye(n);
		var beta = [];
		var V = [];
	}
	else
		T = matrixCopy(A);
	var p;
	var w;
	var vwT;
	var normTkp1k;
	var householder;

	for (k=0; k < n-2; k++) {
		Tkp1k = get ( T, range(k+1, n), k);
		Tkp1kp1 = get ( T, range(k+1,n), range(k+1, n));

		householder = house ( Tkp1k );
		p = mulScalarVector( householder.beta , mulMatrixVector( Tkp1kp1, householder.v ) );
		w = subVectors ( p, mulScalarVector( 0.5*householder.beta * dot(p, householder.v ), householder.v) );

		/*
		T[k+1][k] = norm ( Tkp1k );
		T[k][k+1] = T[k+1][k];
		*/
		// make T really tridiagonal: the above does not modify the other entries to set them to 0
		normTkp1k = zeros(n-k-1);
		normTkp1k[0] = norm ( Tkp1k );
		set ( T, k, range(k+1,n ), normTkp1k );
		set ( T, range(k+1,n), k, normTkp1k);

		vwT = outerprodVectors(householder.v,w);
		set ( T, range(k+1,n), range(k+1, n), subMatrices( subMatrices ( Tkp1kp1, vwT) , transpose(vwT)) );

		if ( returnQ ) {
			V[k] = householder.v;
			beta[k] = householder.beta;
		}
	}
	if ( returnQ ) {
		var updateQ = function(j, v, b) {
			// Q = Q - b* v (Q'v)'
			//smallQ =  get(Q, range(j,n), range(j,n) );// matrix
			//set ( Q, range(j,n), range(j,n) , subMatrices (  smallQ , outerprodVectors(  V[k], mulMatrixVector( transposeMatrix(smallQ), V[k]), beta[k] ) ) );
			var i,k;
			var Qtv = zeros(n-j);
			var n_j = n-j;
			for ( i=0; i<n_j; i++) {
				var Qi = (i+j)*n + j;
				for ( k=0;k<n_j; k++)
					Qtv[k] += v[i] * Q.val[Qi + k];
			}
			for ( i=0; i < n_j; i++) {
				var Qi = (i+j)*n + j;
				var betavk = b * v[i];
				for ( k=0; k < n_j ; k++) {
					Q.val[Qi + k] -= betavk * Qtv[k];
				}
			}
		};

		// Backaccumulation of Q
		for ( k=n-3; k >=0; k--) {
			updateQ(k+1,V[k], beta[k]);
		}
		return Q;
	}
	else
		return T;
}
function givens(a,b,Gi,Gk,n) {
	// compute a Givens rotation:
	var c;
	var s;
	var tau;
	var G;

	// Compute c and s
	if ( b == 0) {
		c = 1;
		s = 0;
	}
	else {
		if ( Math.abs(b) > Math.abs(a) ) {
			tau = -a / b;
			s = 1 / Math.sqrt(1+tau*tau);
			c = s*tau;
		}
		else {
			tau = -b / a;
			c = 1 / Math.sqrt(1+tau*tau);
			s = c * tau;
		}
	}

	if ( arguments.length == 5 ) {
		// Build Givens matrix G from c and s:
		G = eye(n) ;
		G.val[Gi*n+Gi] = c;
		G.val[Gi*n+Gk] = s;
		G.val[Gk*n+Gi] = -s;
		G.val[Gk*n+Gk] = c;
		return G;
	}
	else {
		return [c,s];
	}

}
/**
 * @param {number}
 * @param {number}
 * @param {number}
 * @param {number}
 * @param {Matrix}
 */
function premulGivens ( c, s, i, k, A) {
	// apply a Givens rotation to A : A([i,k],:) = G' * A([i,k],:)
	//  with G = givens (a,b,i,k) and [c,s]=givens(a,b)
	// NOTE: this modifies A

	const n = A.n;
	var j;
	const ri = i*n;
	const rk = k*n;
	var t1;
	var t2;
	for ( j=0; j < n; j++) {
		t1 = A.val[ri + j];
		t2 = A.val[rk + j];
		A.val[ri + j] = c * t1 - s * t2;
		A.val[rk + j] = s * t1 + c * t2;
	}
}
/**
 * @param {number}
 * @param {number}
 * @param {number}
 * @param {number}
 * @param {Matrix}
 */
function postmulGivens ( c, s, i, k, A) {
	// apply a Givens rotation to A : A(:, [i,k]) =  A(:, [i,k]) * G
	//  with G = givens (a,b,i,k) and [c,s]=givens(a,b)
	// NOTE: this modifies A

	const m = A.length;
	var j;
	var t1;
	var t2;
	var rj = 0;
	for ( j=0; j < m; j++) {
		t1 = A.val[rj + i];
		t2 = A.val[rj + k];
		A.val[rj + i] = c * t1 - s * t2;
		A.val[rj + k] = s * t1 + c * t2;
		rj += A.n;
	}
}

function implicitSymQRWilkinsonShift( T , computeZ) {
	// compute T = Z' T Z
	// if computeZ:  return {T,cs} such that T = Z' T Z  with Z = G1.G2...
	// and givens matrices Gk of parameters cs[k]

	const n = T.length;
	const rn2 = n*(n-2);
	const rn1 = n*(n-1);

	const d = ( T.val[rn2 + n-2] - T.val[rn1 + n-1] ) / 2;
	const t2 = T.val[rn1 + n-2] * T.val[rn1 + n-2] ;
	const mu = T.val[rn1 + n-1] - t2 / ( d + Math.sign(d) * Math.sqrt( d*d + t2) );
	var x = T.val[0] - mu; // T[0][0]
	var z = T.val[n];		// T[1][0]
	var cs;
	if ( computeZ)
		var csArray = new Array(n-1);
		//var Z = eye(n);

	var k;
	for ( k = 0; k < n-1; k++) {
		/*
		G = givens(x,z, k, k+1, n);
		T = mul(transpose(G), mul(T, G) ); // can do this much faster
		if ( computeZ ) {
			Z = mul(Z, G );
		}
		*/
		cs = givens(x,z);
		postmulGivens(cs[0], cs[1], k, k+1, T);
		premulGivens(cs[0], cs[1], k, k+1, T);
		if( computeZ )
			csArray[k] = [cs[0], cs[1]];
			//postmulGivens(cs[0], cs[1], k, k+1, Z);

		if ( k < n-2 ) {
			var r = n*(k+1) + k;
			x = T.val[r];
			z = T.val[r + n]; // [k+2][k];
		}
	}
	if ( computeZ) {
		return {"T": T, "cs": csArray} ;
//		return {"T": T, "Z": Z} ;
	}
	else
		return T;
}

function eig( A , computeEigenvectors ) {
	// Eigendecomposition of a symmetric matrix A (QR algorithm)

	var Q;
	var D;
	if ( computeEigenvectors ) {
		D = matrixCopy(A);
		Q = tridiagonalize( D, true );
	}
	else {
		D = tridiagonalize( A );
	}

	var q;
	var p;
	const n = A.length;
	var i;

	const TOL = 1e-12; //10 * EPS;

	do {
		for ( i=0; i<n-1; i++) {
			if ( Math.abs( D.val[i*n + i+1] ) < TOL * ( Math.abs(D.val[i*n+i] ) + Math.abs(D.val[(i+1)*n+i+1] ) ) ) {
				D.val[i*n+i+1] = 0;
				D.val[(i+1)*n+i] = 0;
			}
		}

		// find largest q such that D[n-p-q:n][n-p-q:n] is diagonal:
		if ( !isZero( D.val[(n-1)*n+n-2] )  || !isZero( D.val[(n-2)*n + n-1] )  )
			q = 0;
		else {
			q = 1;
			while ( q < n-1 && isZero( D.val[(n-q-1)*n+ n-q-2] ) && isZero( D.val[(n-q-2)*n + n-q-1] ) )
				q++;
			if ( q >= n-1 )
				q = n;
		}

		// find smallest p such that D[p:q][p:q] is unreduced ( without zeros on subdiagonal?)
		p = -1;
		var zerosOnSubdiagonal ;
		do {
			p++;
			zerosOnSubdiagonal = false;
			k=p;
			while (k<n-q-1 && zerosOnSubdiagonal == false) {
				if ( isZero ( D.val[(k+1)*n + k] ) )
					zerosOnSubdiagonal = true;
				k++;
			}
		} while (  zerosOnSubdiagonal && p + q < n  );

		// Apply implicit QR iteration
		if ( q < n ) {

			if ( computeEigenvectors ) {
				var res = implicitSymQRWilkinsonShift( get ( D, range(p,n-q), range(p,n-q)), true);
				set( D, range(p,n-q), range(p,n-q), res.T );
				for ( var kk = 0; kk < n-q-p-1; kk++)
					postmulGivens(res.cs[kk][0], res.cs[kk][1], p+kk, p+kk+1, Q);
				//Z = eye(n);
				//set(Z, range(p,n-q), range(p,n-q), DZ22.Z );
				// Q = mulMatrixMatrix ( Q, Z );

			}
			else {
				set( D, range(p,n-q), range(p,n-q), implicitSymQRWilkinsonShift( get ( D, range(p,n-q), range(p,n-q)) , false)) ;
			}
		}

	} while (q < n ) ;

	if ( computeEigenvectors ) {
		return { "V" : diag(D), "U": Q};
	}
	else
		return diag(D);
}

function eigs( A, r, smallest ) {
	// Compute r largest or smallest eigenvalues and eigenvectors
	if( typeof(r) == "undefined")
		var r = 1;
	if( typeof(smallest) == "undefined" || smallest == false || smallest !="smallest" ) {
		if ( r == 1)
			return eig_powerIteration ( A );
		else
			return eig_orthogonalIteration ( A , r) ;
	}
	else {
		// look for smallest eigenvalues
		if ( r == 1)
			return eig_inverseIteration ( A , 0);
		else
			return eig_bisect( A, r);
			//return eig_inverseOrthogonalIteration ( A , r) ;
	}
}

function eig_powerIteration ( A , u0) {
// Compute the largest eigenvalue and eigenvector with the power method
	const maxIters = 1000;
	var k;
	const n = A.length;

	// init with a random u or an initial guess u0
	var u;
	if ( typeof(u0) == "undefined")
		u = randn(n);
	else
		u = u0;
	u = mulScalarVector(1/norm(u), u);
	var lambda = 1;
	for ( k=0; k< maxIters; k++) {
		// Apply the iteration : u = Au / norm(Au)
		u = mulMatrixVector(A, u) ;
		lambda = norm(u);
		u = mulScalarVector(1/ lambda, u);
	}
	return { "v" : lambda, "u" : u};
}

function eig_orthogonalIteration ( A, r ) {

	if ( r == 1 )
		return eig_powerIteration ( A );

// Compute the r largest eigenvalue and eigenvector with the power method (orthogonal iteration)
	const maxIters = 1000;
	var k;
	const n = A.length;

	// init with a random Q
	var Q = randn(n,r);
	var normQ = norm(Q,1);
	Q = entrywisediv(Q, mul(ones(n),normQ) );
	var QR;
	var Z;

	const TOL = 1e-11;
	var V;

	for ( k=0; k< maxIters; k++) {

		// Z = AQ
		Z = mulMatrixMatrix(A, Q);
		if ( Math.floor(k / 50) == k / 50) {
			// convergence test
			V = mulMatrixMatrix(transpose(Q), Z);

			if ( norm ( subMatrices ( Z, mulMatrixMatrix(Q, diag(diag(V)) ) ) ) < TOL )
				break;
		}

		// QR = Z	// XXX maybe not do this at every iteration...
		Q = qroriginal(Z,r).Q;

	}

	V = mulMatrixMatrix(transpose(Q), mulMatrixMatrix(A, Q) );

	return {"V": diag(V ), "U" : Q};
}

function eig_inverseIteration ( A, lambda ) {
	// Compute an eigenvalue-eigenvector pair from an approximate eigenvalue with the inverse iteration
	var perturbation = 0.0001*lambda;

	if ( typeof(maxIters) == "undefined" )
		var maxIters = 100;

	var k;
	const n = A.length;

	// apply power iteration with (A - lambda I)^-1 instead of A
	var A_lambdaI = sub(A, mul(lambda + perturbation, eye(n) ));
	var QR = qr( A_lambdaI ); // and precompute QR factorization

	while (QR.rank < n) { // check if not singular
		perturbation *= 10;
		A_lambdaI = sub(A, mul(lambda + perturbation, eye(n) ));
		QR = qr( A_lambdaI ); // and precompute QR factorization
		//console.log(perturbation);
	}

	// init
	var u = sub(mul(2,rand(n)),1); //ones(n); //
	u = mulScalarVector( 1/norm(u), u );
	var v;
	var r;
	var norminfA = norminf(A);
	k = 0;
	do {
		// u =  solve(A_lambdaI , u) ;

		u = solveWithQRcolumnpivoting ( QR, u ); // QR factorization precomputed

		v = norm(u);
		u = entrywisediv(u , v);

		r = mulMatrixVector(A_lambdaI, u);

		k++;
	} while ( k < maxIters && maxVector(absVector(r)) < 1e-10 * norminfA); // && Math.abs(v * perturbation - 1 ) < EPS );
	return u;

}
function eigenvector ( A, lambda ) {
	return eig_inverseIteration(A, lambda, 2);
}

function eig_inverseOrthogonalIteration ( A, r ) {

	if ( r == 1 )
		return eig_inverseIteration ( A );

// Compute the r smallest eigenvalue and eigenvectors with the inverse power method
// (orthogonal iteration)
	const maxIters = 1000;
	var k;
	const n = A.length;
	var QR = qr( A ); // precompute QR factorization

	// init with a random Q
	var Q = randn(n,r);
	var normQ = norm(Q,1);
	Q = entrywisediv(Q, mul(ones(n),normQ) );
	var QR;
	var Z;

	const TOL = 1e-11;
	var V;

	for ( k=0; k< maxIters; k++) {

		// Z = A^-1 Q
		Z = solveWithQRcolumnpivotingMultipleRHS ( QR, Q );

		if ( Math.floor(k / 50) == k / 50) {
			// convergence test
			V = mulMatrixMatrix(transpose(Q), Z);

			if ( norm ( subMatrices ( Z, mulMatrixMatrix(Q, V ) ) ) < TOL )
				break;
		}

		// QR = Z	// XXX maybe not do this at every iteration...
		Q = qroriginal(Z,r).Q;

	}

	V = mulMatrixMatrix(transpose(Q), mulMatrixMatrix(A, Q) );

	return {"V": diag(V ), "U" : Q, "iters": k};
}


function eig_bisect( A, K ) {
// find K smallest eigenvalues

/*
TEST
//Symmetric eigenvalue decomposition
X = rand(5,5)
A = X*X'
v = eig(A)
eig_bisect(A,3)
*/

	var x,y,z;

	// Tridiagonalize A
	var T = tridiagonalize( A );
	const n = T.n;
	var a = diag(T);
	var b = zeros(n);
	var i;
	for ( i=0; i < n-1; i++)
		b[i] =  T.val[i*n + i + 1];

	// Initialize [y,z] with Gershgorin disk theorem
	var y0 = a[0] - b[0];
	var z0 = a[0] + b[0];
	for ( var i=1; i < n; i++) {
		var yi = a[i] - b[i] - b[i-1];
		var zi = a[i] + b[i] + b[i-1];
		if( yi < y0 )
			y0 = yi;
		if( zi > z0 )
			z0 = zi;
	}

	/*
	// polynomial evaluation and counting sign changes (original method)
	var polya = function (x,a,b,n) {
		var pr_2 = 1;
		var pr_1 = a[0] - x;
		var pr;
		var signchanges = 0;
		if (  pr_1 < EPS )
			signchanges = 1;

		var r;
		for ( r = 1; r < n ; r++) {
			pr = (a[r] - x) * pr_1 - b[r-1] * b[r-1] * pr_2;

			if ( Math.abs(pr) < EPS || (pr > 0 &&  pr_1 < 0 ) || (pr < 0) && (pr_1 > 0) )
				signchanges ++;

			pr_2 = pr_1;
			pr_1 = pr;
		}
		return signchanges;
	};
	*/

	// ratio of polynomials evaluation and counting sign changes
	// (modification discussed in Barth et al., 1967 for better stability due to pr ~ 0 in the above)
	var polyq = function (x,a,b,n) {
		var qi_1 = a[0] - x;
		var qi;
		var signchanges = 0;
		if (  qi_1 < EPS )
			signchanges = 1;

		var i;
		for ( i = 1; i < n ; i++) {
			qi = (a[i] - x) - b[i-1] * b[i-1] / qi_1;

			if ( qi < EPS )
				signchanges ++;

			if ( Math.abs(qi) < EPS )
				qi_1 = EPS;
			else
				qi_1 = qi;
		}
		return signchanges;
	};


	// Start bisection
	const TOL = 1e-10;
	var lambda = zeros(K);
	var xu = entrywisemul(z0,ones(K)); // upper bounds on lambdas
	y = y0;
	var n_lowerthan_x;// nb of eigenvalues lower than x
	for ( var k = 1; k <= K ; k++ ) {
		// k is the number of desired eigenvalues in this sweep

		z = xu[k-1];
		//y=y; from previous sweep

		// find the (n-k+1)th eigenvalue
		while ( Math.abs(z - y) > TOL*(Math.abs(y) + Math.abs(z)) ) {
			x = (y+z)/2;
			n_lowerthan_x = polyq(x,a,b,n);

			if(n_lowerthan_x  >= k )
				z = x; // enough eigenvalues below x, decrease upper bound to x
			else
				y = x; // not enough ev below x, increase lower bound to x

			// update boudns on other lambdas
			for ( var j=k+1; j <= K; j++)
				if ( n_lowerthan_x >= j )
					xu[j-1] = x;

		}
		lambda[k-1] = (y+z)/2;
	}
	//return lambda;

	// Compute eigenvectors: XXX can be faster by using inverse iteration on the tridiagonal matrix
	//						 with faster system solving

	var u = eigenvector( A, lambda[0] );
	var U = mat([u],false);

	for ( k = 1; k < K; k++) {
		// deal with too close eigenvalues
		var perturbtol = 10 * Math.max(EPS, Math.abs(EPS * lambda[k-1]));
		if ( lambda[k] < lambda[k-1] + perturbtol )
			lambda[k] = lambda[k-1] + perturbtol;

		u = eigenvector( A, lambda[k] );
		U = mat([U, u], false );
		U = qroriginal( U, U.n ).Q; // orthogonalize
	}


	return {U: U, V: lambda};
}


function bidiagonalize( A, computeU, thinU , computeV ) {
	// B = U' A V , where B is upper bidiagonal

	var j;
	const m = A.length;
	const n = A.n;
	var B;
	B = matrixCopy( A );

	var householder;

	if ( computeU ) {
		if ( thinU ) {
			var U = eye(m,n);
			var nU = n;
		}
		else {
			var U = eye(m);
			var nU = m;
		}
	}
	if ( computeV ) {
		var V = eye(n);
	}


	var updateB1 = function (j, v, beta) {
		// B = B - (beta v) ( v'* B) = B-outer(beta v, B'*v)
		//Bjmjn = get ( B, range(j,m), range(j, n));
		//set ( B, range(j,m), range(j,n), sub ( Bjmjn , outerprod ( householder.v, mul(transpose(Bjmjn), householder.v), householder.beta) ) );

		var i,k;
		var Btv = zeros(n-j);
		var n_j = n-j;
		var m_j = m-j;
		for ( i=0; i<m_j; i++) {
			var Bi = (i+j)*n + j;
			for ( k=0;k<n_j; k++)
				Btv[k] += v[i] * B.val[Bi+k];
		}
		for ( i=0; i < m_j; i++) {
			var betavk = beta * v[i];
			var Bi = (i+j)*n + j;
			for ( k=0; k < n_j ; k++) {
				B.val[Bi+k] -= betavk * Btv[k];
			}
		}
	};
	var updateB2 = function (j, v, beta) {
		// B = B - beta (Bv) v' (with B = B_j:m, j+1:n)

		//Bjmjn = get ( B, range(j,m), range(j+1, n));
		//set ( B, range(j,m), range(j+1,n) , sub( Bjmjn, outerprod( mul(Bjmjn, householder.v), householder.v, householder.beta) ) );
		var i,k;
		var n_j_1 = n-j-1;
		for ( i=j; i < m; i++) {
			var Bi = i*n + j + 1;
			var Bv = 0;
			for ( k=0;k<n_j_1; k++)
				Bv += B.val[Bi + k] *  v[k] ;
			var betaBvk = beta * Bv;
			for ( k=0; k < n_j_1 ; k++) {
				B.val[Bi + k] -= betaBvk * v[k];
			}
		}
	};

	if ( computeV ) {
		var updateV = function (j, v, beta) {
			//smallV = get ( V, range(0,n), range(j+1, n));
			//set ( V, range(0,n), range(j+1,n) , sub( smallV, outerprod( mul(smallV, householder.v), householder.v, householder.beta) ) );
			var i,k;
			var n_j_1 = n-j-1;
			for ( i=0; i < n; i++) {
				var Vi = i*n + j + 1;
				var Vv = 0;
				for ( k=0;k<n_j_1; k++)
					Vv += V.val[Vi + k] *  v[k] ;
				var betaVvk = beta * Vv;
				for ( k=0; k < n_j_1 ; k++) {
					V.val[Vi + k] -= betaVvk * v[k];
				}
			}
		};
	}
	if ( computeU ) {
		var hv=new Array(n);// Householder vectors and betas
		var hb=new Array(n);
	}

	for (j=0; j < n ; j++) {

		if ( j < m-1)  {
			householder = house( get ( B, range(j, m), j) );

			updateB1(j, householder.v, householder.beta);

			if ( computeU ) {
				hv[j] = vectorCopy(householder.v);
				hb[j] = householder.beta;
				//	updateU(j, householder.v, householder.beta);
			}
		}

		if ( j < n-2) {
			householder = house ( B.row(j).subarray(j+1, n) ) ;

			updateB2(j, householder.v, householder.beta);

			if( computeV ) {
				updateV(j, householder.v, householder.beta);

			}
		}
	}
	if (computeU) {
		// Back accumulation of U (works with less than m columns)
		// Un_1 = (I-beta v v')Un = Un - beta v (v' Un)

		/*for (j=n-1;j>=0; j--) {
			if (j<m-1){
				smallU = get(U,range(j,m),[]);
				set(U,range(j,m),[], sub(smallU, mul(bv[j],mul(hv[j], mul(transpose(hv[j]) , smallU)))));
			}
		}*/
		var updateU = function (j, v, beta) {
			var i,k;
			var vtU = zeros(nU);
			for ( i=j; i<m; i++) {
				var Ui = i*nU;
				var i_j = i-j;
				for ( k=0;k<nU; k++)
					vtU[k] += v[i_j] * U.val[Ui + k];
			}
			for ( i=j; i < m; i++) {
				var betavk = beta * v[i-j];
				var Ui = i*nU;
				for ( k=0; k < nU ; k++) {
					U.val[Ui + k] -= betavk * vtU[k];
				}
			}
		};
		var nj = Math.min(n-1,m-2);
		for (j=nj;j>=0; j--) {
				updateU(j,hv[j], hb[j]);
		}
	}

	if ( computeU && computeV ) {
		return { "U" : U, "V": V, "B": B};
	}
	else if (computeV )
		return { "V": V, "B": B};
	else if (computeU)
		return { "U" : U, "B": B};
	else
		return B;
}


function GolubKahanSVDstep ( B, i, j, m, n, computeUV ) {
	// Apply GolubKahanSVDstep to B(i:i+m, j:j+n)
	// Note: working on Utrans
	if (type ( B ) != "matrix" )
		return B;

	if ( n < 2 )
		return B;

	const rn2 = (i+n-2)*B.n + j;
	const dm = B.val[rn2 + n-2];
	const fm = B.val[rn2 + n-1];
	var fm_1 ;
	if ( n>2)
		fm_1 = B.val[(i+n-3)*B.n + j + n-2];
	else
		fm_1 = 0;

	const dn = B.val[(i+n-1)*B.n + j + n-1];

	const d = ( dm*dm + fm_1*fm_1 - dn*dn - fm*fm ) / 2;
	const t2 = dm*fm * dm*fm;
	const mu = dn*dn+fm*fm - t2 / ( d + Math.sign(d) * Math.sqrt( d*d + t2) );

	var k;

	//var B0 = getCols ( B, [0]);
	//var B1 = getCols ( B, [1]) ;
	//var y = mul( B0, B0 ) - mu;
	//var z =  mul( B0, B1 );
	var y = - mu;
	var z = 0.0;
	var r0 = i*B.n + j;
	for ( k = 0; k< n; k++) {
		y += B.val[r0] * B.val[r0];
		z += B.val[r0] * B.val[r0+1];
		r0 += B.n;
	}


	var G;
	var cs;

	var postmulgivens = function ( c, s, k1, k2) {
		// apply a Givens rotation to a subset of rows of B : B(i:i+m, [k1,k2]) =  B(i:i+m, [k1,k2]) * G
		var jj;
		var t1;
		var t2;
		var rj = i*B.n + j;
		for ( jj=0; jj < m; jj++) {
			t1 = B.val[rj + k1];
			t2 = B.val[rj + k2];
			B.val[rj + k1] = c * t1 - s * t2;
			B.val[rj + k2] = s * t1 + c * t2;
			rj += B.n;
		}
	}
	var premulgivens = function ( c, s, k1, k2) {
	// apply a Givens rotation to a subset of cols of B : B([k1,k2],j:j+n) = G' * B([k1,k2],j:j+n)
		var jj;
		const ri = (i+k1)*B.n + j;
		const rk = (i+k2)*B.n + j;
		var t1;
		var t2;
		for ( jj=0; jj < n; jj++) {
			t1 = B.val[ri + jj];
			t2 = B.val[rk + jj];
			B.val[ri + jj] = c * t1 - s * t2;
			B.val[rk + jj] = s * t1 + c * t2;
		}
	}

	if ( computeUV) {
		//var U = eye(m);
		//var V = eye(n);
		var csU = new Array(n-1);
		var csV = new Array(n-1);
	}

	for ( k = 0; k < n-1 ; k++) {
		cs = givens(y,z);
		postmulgivens(cs[0],cs[1], k, k+1);

		if ( computeUV ) {
			csV[k] = [cs[0], cs[1]];
			//	postmulGivens(cs[0],cs[1], k, k+1, V);
		}


		y = B.val[(i+k)*B.n + j + k];
		z = B.val[(i+k+1)*B.n + j + k];

		cs = givens(y,z);
		premulgivens(cs[0],cs[1], k, k+1);

		if ( computeUV ) {
			csU[k] = [cs[0], cs[1]];
			//premulGivens(cs[0],cs[1], k, k+1, U);
		}

		if ( k < n-2 ) {
			y = B.val[(i+k)*B.n + j + k+1];
			z = B.val[(i+k)*B.n + j + k+2];
		}

	}

	if ( computeUV)
		return {csU: csU, csV: csV};
}

function svd( A , computeUV ) {
/* TEST:
A=[ [-149,-50,-154],[537,180,546],[-27,-9,-25]]
s=svd(A)
should return [ 817.7597, 2.4750, 0.0030]
*/

	if ( type(A) == "vector" || (type(A) == "matrix" && A.n == 1) ) {
		return { "U" : matrixCopy(A), "S" : ones(1,1), "V" : ones(1,1), "s" : [1] };
	}
	if ( A.m == 1) {
		return { "U" : ones(1,1), "S" : ones(1,1), "V" : transpose(A), "s" : [1] };
	}


	var i;
	var m = A.length;
	var n = A.n;


	var Atransposed = false;
	if ( n > m ) {
		Atransposed = true;
		var At = transposeMatrix(A);
		n = m;
		m = At.length;
	}

	var computeU = false;
	var computeV = false;
	var thinU = false;
	if ( typeof( computeUV) != "undefined" && computeUV!==false)  {

		if ( computeUV === "full" ) {
			computeU = true;
			computeV = true;
			thinU = false;
		}
		else if (computeUV === true || computeUV === "thin" ) {
			computeU = true;
			computeV = true;
			thinU = true;
		}
		else if ( typeof(computeUV) == "string") {
			if ( computeUV.indexOf("U") >=0 )
				computeU = true;
			if ( computeUV.indexOf("V") >=0 )
				computeV = true;
			if ( computeUV.indexOf("thin") >=0 )
				thinU = true;
		}
		var UBV;
		if ( Atransposed ) {
			var tmp = computeU;
			computeU = computeV;
			computeV = tmp;
			UBV = bidiagonalize( At, computeU, thinU, computeV );
		}
		else
			UBV =  bidiagonalize( A, computeU, thinU, computeV );

		if ( computeU ) {
			var U = transpose(UBV.U);//Utrans
		}
		else
			var U = undefined;

		if( computeV ) {
			var V = UBV.V;
			var Vt = transposeMatrix(V);
		}
		else
			var V = undefined;

		var B = UBV.B;
	}
	else {
		if ( Atransposed )
			var B = bidiagonalize( At, false, false, false );
		else
			var B = bidiagonalize( matrixCopy(A), false, false, false );
	}

	var B22;
	var U22;
	var V22;
	var cs;

	var q;
	var p;
	var k;

	const TOL = 1e-11;
	var iter = 0;
	do {

		for ( i=0; i<n-1; i++) {
			if ( Math.abs( B.val[i*B.n + i+1] ) < TOL * ( Math.abs(B.val[i*B.n + i]) + Math.abs(B.val[(i+1) * B.n + i+1]) ) ) {
				B.val[i*B.n + i+1] = 0;
			}
		}

		// find largest q such that B[n-q+1:n][n-q+1:n] is diagonal (in matlab notation):
		q = 0;
		while ( q < n && Math.abs( B.val[(n-q-1)*B.n + n-q-2] ) < TOL && Math.abs( B.val[(n-q-2)*B.n + n-q-1] ) < TOL ) {
			q++;
		}
		if ( q == n-1 )
			q = n;

		// find smallest p such that B[p+1:n-q][p+1:n-q] has no zeros on superdiag (in matlab notation):
		p=0;	// size of B11 = first index of B22 in our notation
		while ( p < n-q && Math.abs( B.val[p*B.n + p+1] ) < TOL * ( Math.abs(B.val[p*B.n + p]) + Math.abs(B.val[(p+1) * B.n + (p+1)]) )  ) {
			p++;
		}

		if ( q < n ) {
			var DiagonalofB22isZero = -1;
			for ( k=p; k< n-q ; k++) {
				if ( Math.abs(  B.val[k*B.n + k] ) < TOL ) {
					DiagonalofB22isZero = k;
					break;
				}
			}
			if ( DiagonalofB22isZero >= 0 ) {
				if ( DiagonalofB22isZero < n-q-1 ) {
					// Zero B(k,k+1) and entire row k...
			  		for (k=DiagonalofB22isZero+1; k < n; k++) {

						cs = givens( B.val[k*B.n + k] , B.val[DiagonalofB22isZero * B.n + k] );
						premulGivens(cs[0],cs[1], k,DiagonalofB22isZero, B);
						if ( computeU )
							premulGivens(cs[0],cs[1], k, DiagonalofB22isZero, U);
					}
				}
				else {
					// Zero B(k-1,k) and entire column k...
		      		for (k=n-q-2; k >= p; k--) {

						cs = givens(B.val[k*B.n + k] , B.val[k*B.n + n-q-1] );
						postmulGivens(cs[0],cs[1], k, n-q-1, B);
						if ( computeV )
							premulGivens(cs[0],cs[1], k, n-q-1, Vt);
//							postmulGivens(cs[0],cs[1], j, n-q-1, V);
					}
				}
			}
			else {
				//B22 = get ( B, range(p , n - q ) , range (p , n-q ) );

				if ( computeUV ) {
					// UBV = GolubKahanSVDstep( B22, true ) ;
					// set ( U, range(p,n-q), [], mul(UBV.U, get(U, range(p,n-q), []) ) );
					// set ( Vt, range(p,n-q), [], mul(transpose(UBV.V), getRows(Vt, range(p,n-q)) ) );

					var GKstep = GolubKahanSVDstep( B, p, p, n-q-p, n-q-p, true ) ;// this updates B22 inside B
					for ( var kk=0; kk < n-q-p-1; kk++) {
						if ( computeU )
							premulGivens(GKstep.csU[kk][0], GKstep.csU[kk][1], p+kk, p+kk+1, U);
						if ( computeV )
							premulGivens(GKstep.csV[kk][0], GKstep.csV[kk][1], p+kk, p+kk+1, Vt); // premul because Vtransposed
					}
				}
				else {
					GolubKahanSVDstep( B, p, p, n-q-p, n-q-p ) ;
				}
				//set ( B , range(p , n - q ) , range (p , n-q ), B22  );
			}
		}
		iter++;
	} while ( q < n) ;

	if (computeUV ) {

		if ( computeV)
			V = transposeMatrix(Vt);

		// Correct sign of singular values:
		var s = diag(B);
		var signs = zeros(n);
		for ( i=0; i< n; i++) {
			if (s[i] < 0) {
				if ( computeV )
					set(V, [], i, minus(get(V,[],i)));
				s[i] = -s[i];
			}
		}

		// Rearrange in decreasing order:
		var indexes = sort(s,true, true);
		if(computeV)
			V = get( V, [], indexes);
		if(computeU) {
			if ( !thinU) {
				for ( i=n; i < m; i++)
					indexes.push(i);
			}
			U = get(U, indexes,[]) ;
		}

		if ( thinU )
			var S = diag(s) ;
		else
			var S = mat([diag(s), zeros(m-n,n)],true) ;

		var Ut = undefined;
		if ( computeU )
			Ut = transpose(U);

		if ( Atransposed ) {
			if ( thinU )
				return { "U" : V, "S" : S, "V" : Ut, "s" : s };
			else
				return { "U" : V, "S" : transpose(S), "V" : Ut, "s" : s };
		}
		else {
			return { "U" : Ut, "S" : S, "V" : V, "s" : s };
		}
	}
	else
		return sort(abs(diag(B)), true);
}

function rank( A ) {
	const s = svd(A);
	var rank = 0;
	var i;
	for ( i=0;i < s.length;i++)
		if ( s[i] > 1e-10 )
			rank++;

	return rank;
}

function nullspace( A ) {
	// Orthonormal basis for the null space of A
	const s = svd( A, "V" ) ;
	const n = A.n;

	var rank = 0;
	const TOL = 1e-8;
	while ( rank < n && s.s[rank] > TOL )
		rank++;

	if ( rank < n )
		return get ( s.V, [], range(rank, n) );
	else
		return zeros(n);

}

function orth( A ) {
	// Orthonormal basis for the range of A
	const s = svd( A, "thinU" ) ;
	const n = A.n;

	var rank = 0;
	const TOL = 1e-8;
	while ( rank < n && s.s[rank] > TOL )
		rank++;

	return get ( s.U, [], range(0,rank) );

}

/////////////////////////////
//// Sparse matrix and vectors
/////////////////////////////

/**
 *
 * new spVector(n) => allocate for n nonzeros with dim n
 * new spVector(n, nnz) => allocate for nnz nonzeros out of n
 * new spVector(n,values,indexes) => allocate for values.length nonzeros
 *
 * @constructor
 * @struct
 */
function spVector(n, values, indexes) {

	/** @const */ this.length = n;
	/** @const */ this.size = [n,1];
	/** @const */ this.type = "spvector";

	if ( arguments.length <= 2) {
		if ( arguments.length == 1)
			var nnz = n;		// too large but more efficient at some point...
		else
			var nnz = values;

		/** @type{Float64Array} */ this.val = new Float64Array(nnz);  // nz values
		/** @type{Uint32Array} */ this.ind = new Uint32Array(nnz);   // ind[k] = index of val[k]
	}
	else {
		var nnz = values.length;
		/** @type{Float64Array} */ this.val = new Float64Array(values);  // nz values
		/** @type{Uint32Array} */ this.ind = new Uint32Array(indexes);   // ind[k] = index of val[k]
	}

	/** @const */ this.nnz = nnz;
}
/*
 * @param{number}
 * @return{number}
 */
spVector.prototype.get = function ( i ) {
	var k = this.ind.indexOf(i);
	if ( k < 0 )
		return 0;
	else
		return this.val[k];
}
/*
 * @param{number}
 * @param{number}
 */
spVector.prototype.set = function ( i, value ) {
	// Inefficient do not use this, use sparse(x) instead
	if ( i > this.n ) {
		error( "Error in spVector.set(i,value): i > this.length)");
		return undefined;
	}
	var k = this.ind.indexOf(i);
	if ( k < 0 ) {
		var ind = new Uint32Array(this.nnz + 1);
		var val = new Float64Array(this.nnz + 1);
		k = 0;
		while ( this.ind[k] < i ) { // copy values until i
			ind[k] = this.ind[k];	// making sure this.ind remains sorted
			val[k] = this.val.ind[k];
			k++;
		}
		ind[k] = i;// insert value
		val[k] = value;
		ind.set(this.ind.subarray(k), k+1);// copy rest of vector
		val.set(this.val.subarray(k), k+1);
		this.nnz++;
	}
	else
		this.val[k] = value;

	return value;
}
/*
 * @return{spVector}
 */
spVector.prototype.copy = function () {
	return new spVector(this.n, this.val, this.ind);
}

/**
 *
 * new spMatrix(m,n) => allocate for m*n nonzeros
 * new spMatrix(m,n, nnz) => allocate for nnz nonzeros
 * new spMatrix(m,n,values,cols,rows) => allocate for values.length nonzeros
 *
 * @constructor
 * @struct
 */
function spMatrix(m,n, values, cols, rows) {

	/** @const */ this.length = m;
	/** @const */ this.m = m;
	/** @const */ this.n = n;
	/** @const */ this.size = [m,n];
	/** @const */ this.type = "spmatrix";

	if ( arguments.length <= 3) {
		if ( arguments.length == 2)
			var nnz = m*n;		// too large but more efficient at some point...
		else
			var nnz = values;

		/** @type{boolean} */ this.rowmajor = true;
		/** @type{Float64Array} */ this.val = new Float64Array(nnz);  // nnz values
		/** @type{Uint32Array} */ this.cols = new Uint32Array(nnz); // cols[j] = starting index of col j in val and rows
		/** @type{Uint32Array} */ this.rows = new Uint32Array(m+1);   // rows[k] = row of val[k]
	}
	else {
		var nnz = values.length;
		if ( rows.length == nnz && cols.length == n+1 && cols[cols.length-1] == nnz ) {
			/** @type{boolean} */ this.rowmajor = false;
			/** @type{Float64Array} */ this.val = new Float64Array(values);  // nz values
			/** @type{Uint32Array} */ this.cols = new Uint32Array(cols); // cols[j] = starting index of col j in val and rows
			/** @type{Uint32Array} */ this.rows = new Uint32Array(rows);   // rows[k] = row of val[k]
		}
		else {
			/** @type{boolean} */ this.rowmajor = true;
			/** @type{Float64Array} */ this.val = new Float64Array(values);  // nz values
			/** @type{Uint32Array} */ this.cols = new Uint32Array(cols); // cols[k] = col of val[k]
			/** @type{Uint32Array} */ this.rows = new Uint32Array(rows);   // rows[i] = starting index of row i in val and cols
		}
	}

	/** @const */ this.nnz = nnz;

}
/*
 * @return{spMatrix}
 */
spMatrix.prototype.copy = function () {
	return new spMatrix(this.m, this.n, this.val, this.cols, this.rows);
}
/*
 * @return{spMatrix}
 */
spMatrix.prototype.toRowmajor = function () {
	if ( this.rowmajor )
		return this.copy();
	else {
		return sparseMatrixRowMajor( fullMatrix(this) );
	}
}
/*
 * Get a pointer to the spVector for row i
 * @return{spVector}
 */
spMatrix.prototype.row = function ( i ) {
	if ( this.rowmajor ) {
		return new spVector(this.n, this.val.subarray(this.rows[i], this.rows[i+1]), this.cols.subarray(this.rows[i], this.rows[i+1]));
	/*
		var s = this.rows[i];
		var e = this.rows[i+1];
		var vec = new spVector(this.n);
		vec.val.set(this.val.subarray(s,e));
		vec.ind.set(this.cols.subarray(s,e));
		return vec;*/
	}
	else {
		error ("Cannot extract sparse column from a sparse matrix in row major format.");
		return undefined;
	}
}
/*
 * Get a pointer to the spVector for column j
 * @return{spVector}
 */
spMatrix.prototype.col = function ( j ) {
	if ( ! this.rowmajor )
		return new spVector(this.m, this.val.subarray(this.cols[j], this.cols[j+1]), this.rows.subarray(this.cols[j], this.cols[j+1]));
	else {
		error ("Cannot extract sparse column from a sparse matrix in row major format.");
		return undefined;
	}
}

/*
 * @param{number}
 * @param{number}
 * @return{number}
 */
spMatrix.prototype.get = function ( i, j ) {
	if ( this.rowmajor ) {
		var rowind =  this.cols.subarray(this.rows[i], this.rows[i+1]);
		var k = rowind.indexOf(j);
		if ( k < 0 )
			return 0;
		else
			return this.val[this.rows[i] + k];
	}
	else {
		var colind =  this.rows.subarray(this.cols[j], this.cols[j+1]);
		var k = colind.indexOf(i);
		if ( k < 0 )
			return 0;
		else
			return this.val[this.cols[j] + k];
	}
}

function spgetRows(A, rowsrange) {
	var n = rowsrange.length;
	if ( A.rowmajor) {
		if ( n > 1 ) {

			var rowsidx = sort(rowsrange);
			var Ai = new Array(n);
			var nnz = 0;
			for ( var i = 0; i < n; i++) {
				Ai[i] = A.row(rowsidx[i]);
				nnz += Ai[i].val.length;
			}
			var val = new Float64Array( nnz );
			var cols = new Uint32Array( nnz );
			var rows = new Uint32Array( n+1 );
			var k = 0;
			for ( var i = 0; i < n; i++) {
				rows[i] = k;
				val.set(Ai[i].val, k);
				cols.set(Ai[i].ind, k);
				k += Ai[i].val.length;
			}
			rows[i] = k;
			return new spMatrix(n, A.n, val, cols, rows);
		}
		else
			return A.row( rowsrange[0] ) ;
	}
	else {
		return getRows(fullMatrix(A), rowsrange);
	}
}

/**
 * Return the full/dense version of the vector
 * @param{spVector}
 * @return{Float64Array}
 */
function fullVector (x) {
	var k;
	const n = x.length;
	const nnz = x.val.length;
	var a = new Float64Array(n);

	for ( k=0; k < nnz; k++)
		a[x.ind[k]] = x.val[k];

	return a;
}
/**
 * Return the full/dense version of the matrix
 * @param{spMatrix}
 * @return{Matrix}
 */
function fullMatrix (S) {
	const n = S.n;
	if ( S.rowmajor ) {
		var k;
		const m = S.m;
		var A = new Float64Array(m * n);
		var ri = 0;
		for (var i = 0; i < m; i++) {
			var s = S.rows[i];
			var e = S.rows[i+1];
			for ( k=s; k < e; k++) {
				A[ri + S.cols[k] ] = S.val[k];
			}
			ri += n;
		}
		return new Matrix(m, n, A, true);
	}
	else {
		var k;
		var A = new Float64Array(S.m * n);
		for (var j = 0; j < n; j++) {
			var s = S.cols[j];
			var e = S.cols[j+1];
			for ( k=s; k < e; k++) {
				var i = S.rows[k];
				A[i*n + j] = S.val[k];
			}
		}
		return new Matrix(S.m, n, A, true);
	}
}
function full( A ) {
	switch(type(A)) {
	case "spvector":
		return fullVector(A);
		break;
	case "spmatrix":
		return fullMatrix(A);
		break;
	default:
		return A;
		break;
	}
}

/**
 * @param{Float64Array}
 * @return{spVector}
 */
function sparseVector( a ) {
	var i,k;
	const n = a.length;
	var val = new Array();
	var ind = new Array();
	for ( i=0; i < n; i++) {
		if (!isZero(a[i]) ) {
			val.push(a[i]);
			ind.push(i);
		}
	}
	return new spVector(n,val,ind);
}
/**
 * @param{Matrix}
 * @return{spMatrix}
 */
function sparseMatrix( A ) {
	var i,j;
	const m = A.m;
	const n = A.n;
	var val = new Array();
	var rows = new Array();
	var cols = new Uint32Array(n+1);
	var k;
	for ( j=0; j< n; j++) {
		k = j;
		for ( i=0; i < m; i++) {
			// k = i*n+j;
			if (!isZero(A.val[k]) ) {
				val.push(A.val[k]);
				rows.push(i);
				cols[j+1]++;
			}
			k += n;
		}
	}
	for ( j=1; j< n; j++)
		cols[j+1] += cols[j];

	return new spMatrix(m,n,val,cols,rows);
}
/**
 * @param{Matrix}
 * @return{spMatrix}
 */
function sparseMatrixRowMajor( A ) {
	var i,j;
	const m = A.m;
	const n = A.n;
	var val = new Array();
	var cols = new Array();
	var rows = new Uint32Array(m+1);
	var k = 0;
	for ( i=0; i < m; i++) {
		for ( j=0; j< n; j++) {
			// k = i*n+j;
			if (!isZero(A.val[k]) ) {
				val.push(A.val[k]);
				rows[i+1]++;
				cols.push(j);
			}
			k++;
		}
	}
	for ( i=1; i< m; i++)
		rows[i+1] += rows[i];

	return new spMatrix(m,n,val,cols,rows);
}

function sparse( A , rowmajor ) {
	if(typeof(rowmajor) == "undefined" )
		var rowmajor = true;

	switch(type(A)) {
	case "vector":
		return sparseVector(A);
		break;
	case "matrix":
		if ( rowmajor )
			return sparseMatrixRowMajor(A);
		else
			return sparseMatrix(A);
		break;
	case "spvector":
	case "spmatrix":
		return A.copy();
		break;
	default:
		return A;
		break;
	}
}

/**
 * @param{number}
 * @return{spMatrix}
 */
function speye(m,n) {
	if ( typeof(n) == "undefined" )
		var n = m;
	if ( m == 1 && n == 1)
		return 1;

	var e = (m<n)?m:n;

	var val = ones(e);
	var rows = range(e+1);
	var cols = rows.slice(0,e);
	return new spMatrix(m,n,val,cols,rows);
}
/**
 * @param{Float64Array}
 * @return{spMatrix}
 */
function spdiag(val) {
	var n = val.length;
	var rows = range(n+1);
	var cols = rows.slice(0,n);
	var tv = type(val);
	if ( tv == "vector")
		return new spMatrix(n,n,val,cols,rows);
	else {
		error("Error in spdiag( x ): x is a " + tv + " but should be a vector.");
		return undefined;
	}
}

/**
 * @param{spVector}
 * @return{Matrix}
 */
function transposespVector (a) {
	return new Matrix(1,a.length, fullVector(a), true);
}
/**
 * @param{spMatrix}
 * @return{spMatrix}
 */
function transposespMatrix (A) {
	return new spMatrix(A.n, A.m, A.val, A.rows, A.cols);
	/*
	const m = A.m;
	const n = A.n;

	var At = zeros(n, m);
	for ( var j=0; j < n; j++) {
		var s = A.cols[j];
		var e = A.cols[j+1];

		for ( var k=s;k < e; k++) {
			At[ rj + A.rows[k] ] = A.val[k];
		}
		rj += m;
	}
	return sparseMatrix(At);
	*/
}



/** Concatenate sparse matrices/vectors
 * @param {Array}
 * @param {boolean}
 * @return {spMatrix}
 */
function spmat( elems, rowwise ) {
	var k;
	var elemtypes = new Array(elems.length);
	for ( k=0; k < elems.length; k++) {
		elemtypes[k] = type(elems[k]);
	}

	if ( typeof(rowwise) == "undefined")
		var rowwise = true;

	if ( elems.length == 0 ) {
		return [];
	}

	var m = 0;
	var n = 0;
	var nnz = 0;
	var i;
	var j;
	if ( rowwise ) {
		var res = new Array( ) ;

		for ( k= 0; k<elems.length; k++) {
			switch( elemtypes[k] ) {

			case "vector": // vector (auto transposed)
				var v = sparseVector(elems[k]);
				res.push ( v ) ;
				m += 1;
				n = elems[k].length;
				nnz += v.val.length;
				break;

			case "spvector":
				res.push(elems[k]);
				n = elems[k].length;
				m += 1;
				nnz += elems[k].val.length;
				break;

			case "spmatrix":
				for ( var r=0; r < elems[k].m; r++)
					res.push(elems[k].row(r));
				res.push(elems[k]);
				n = elems[k].length;
				m += 1;
				nnz += elems[k].val.length;

				break;

			default:
				return undefined;
				break;
			}
		}

		var M = new spMatrix( m , n , nnz ) ;
		var p = 0;
		M.rows[0] = 0;
		for (k=0; k < res.length ; k++) {
			if ( res[k].val.length > 1 ) {
				M.val.set( new Float64Array(res[k].val), p);
				M.cols.set( new Uint32Array(res[k].ind), p);
				M.rows[k+1] = M.rows[k] + res[k].val.length;
				p += res[k].val.length;
			}
			else if (res[k].val.length == 1) {
				M.val[p] = res[k].val[0];
				M.cols[p] = res[k].ind[0];
				M.rows[k+1] = M.rows[k] + 1;
				p += 1;
			}

		}
		return M;
	}
	else {
		// not yet...

		error("spmat(..., false) for columnwise concatenation of sparse vectors not yet implemented");

		return res;
	}
}



/**
 * @param{number}
 * @param{spVector}
 * @return{spVector}
 */
function mulScalarspVector (a, b) {
	const nnz = b.val.length;
	var c = b.copy();
	for ( var k=0;k < nnz; k++)
		c.val[k] *= a;
	return c;
}
/**
 * @param{number}
 * @param{spMatrix}
 * @return{spMatrix}
 */
function mulScalarspMatrix (a, B) {
	const nnz = B.nnz;
	var C = B.copy();
	for ( var k=0;k < nnz; k++)
		C.val[k] *= a;
	return C;
}

/**
 * @param{spVector}
 * @param{spVector}
 * @return{number}
 */
function spdot (a, b) {
	const nnza = a.val.length;
	const nnzb = b.val.length;
	var c = 0;
	var ka = 0;
	var kb = 0;
	while ( ka < nnza && kb < nnzb ){
		var i = a.ind[ka];
		while ( b.ind[kb] < i && kb < nnzb)
			kb++;
		if(b.ind[kb] == i)
			c += a.val[ka] * b.val[kb];
		ka++;
	}
	return c;
}
/**
 * @param{spVector}
 * @param{Float64Array}
 * @return{number}
 */
function dotspVectorVector (a, b) {
	const nnza = a.val.length;
	var c = 0;
	for ( var ka=0;ka < nnza; ka++)
		c += a.val[ka] * b[a.ind[ka]];

	return c;
}
/**
 * @param{Matrix}
 * @param{spVector}
 * @return{Float64Array}
 */
function mulMatrixspVector (A, b) {
	const m = A.m;
	const n = A.n;
	const nnz = b.val.length;
	var c = zeros(m);
	var ri = 0;
	for ( var i=0;i < n; i++) {
		for ( var k=0; k < nnz; k++)
			c[i] += A.val[ri + b.ind[k]] * b.val[k];
		ri+=n;
	}
	return c;
}
/**
 * @param{spMatrix}
 * @param{Float64Array}
 * @return{Float64Array}
 */
function mulspMatrixVector (A, b) {
	const m = A.m;
	const n = A.n;
	var c = zeros(m);
	if ( A.rowmajor) {
		for(var i=0; i < m; i++) {
			var s = A.rows[i];
			var e = A.rows[i+1];
			for(var k = s; k < e; k++) {
				c[i] += A.val[k] * b[A.cols[k]];
			}
		}
	}
	else {
		for ( var j=0;j < n; j++) {
			var s = A.cols[j];
			var e = A.cols[j+1];
			var bj = b[j];
			for ( var k= s; k < e; k++) {
				c[A.rows[k]] += A.val[k] * bj;
			}
		}
	}
	return c;
}
/**
 * @param{spMatrix}
 * @param{Float64Array}
 * @return{Float64Array}
 */
function mulspMatrixTransVector (A, b) {
	const m = A.m;
	const n = A.n;
	var c = zeros(n);
	if ( A.rowmajor ) {
		for ( var j=0;j < m; j++) {
			var s = A.rows[j];
			var e = A.rows[j+1];
			var bj = b[j];
			for ( var k= s; k < e; k++) {
				c[A.cols[k]] += A.val[k] * bj;
			}
		}
	}
	else {
		for ( var j=0;j < n; j++) {
			var s = A.cols[j];
			var e = A.cols[j+1];
			for ( var k= s; k < e; k++) {
				c[j] += A.val[k] * b[A.rows[k]];
			}
		}
	}
	return c;
}
/**
 * @param{spMatrix}
 * @param{spVector}
 * @return{Float64Array}
 */
function mulspMatrixspVector (A, b) {
	const m = A.m;
	const n = A.n;
	var c = zeros(m);
	const nnzb = b.val.length;
	if ( A.rowmajor) {
		for(var i=0; i < m; i++) {
			c[i] = spdot(A.row(i), b);
		}
	}
	else {
		for ( var kb=0;kb < nnzb; kb++) {
			var j = b.ind[kb];
			var bj = b.val[kb];
			var s = A.cols[j];
			var e = A.cols[j+1];

			for ( var k= s; k < e; k++) {
				c[A.rows[k]] += A.val[k] * bj;
			}
		}
	}
	return c;
}
/**
 * @param{spMatrix}
 * @param{spVector}
 * @return{Float64Array}
 */
function mulspMatrixTransspVector (A, b) {
	const m = A.m;
	const n = A.n;
	var c = zeros(n);
	const nnzb = b.val.length;
	if (A.rowmajor) {
		for ( var kb=0;kb < nnzb; kb++) {
			var j = b.ind[kb];
			var bj = b.val[kb];
			var s = A.rows[j];
			var e = A.rows[j+1];
			for ( var k= s; k < e; k++) {
				c[A.cols[k]] += A.val[k] * bj;
			}
		}
	}
	else {
		for ( var i= 0; i < n; i++) {
			var kb = 0;
			var s = A.cols[i];
			var e = A.cols[i+1];

			for ( var ka=s;ka < e; ka++) {
				var j = A.rows[ka];
				while ( b.ind[kb] < j && kb < nnzb)
					kb++;
				if(b.ind[kb] == i)
					c[i] += A.val[ka] * b.val[kb];
			}
		}
	}
	return c;
}
/**
 * @param{spMatrix}
 * @param{spMatrix}
 * @return{Matrix}
 */
function mulspMatrixspMatrix (A, B) {
	const m = A.m;
	const n = A.n;
	const n2 = B.n;
	var c = zeros(m, n2);

	if ( A.rowmajor ) {
		if ( B.rowmajor ) {
			for ( var ic = 0; ic < m; ic++) {
				var sa = A.rows[ic];
				var ea = A.rows[ic+1];

				for ( var ka = sa; ka < ea; ka++) {
					var j = A.cols[ka];
					var aj = A.val[ka];

					var s = B.rows[j];
					var e = B.rows[j+1];

					var rc = ic * n2 ;
					for (var k= s; k < e; k++) {
						c.val[rc + B.cols[k] ] += aj * B.val[k] ;
					}
				}
			}
		}
		else {
			var kc = 0;
			for ( var i=0; i < m; i++) {
				for ( var j=0; j < n2; j++) {
					c.val[kc] = spdot(A.row(i), B.col(j));
					kc++;
				}
			}
		}
	}
	else {
		if ( B.rowmajor ) {
			for (var ja=0;ja < n; ja++) {
				var sa = A.cols[ja];
				var ea = A.cols[ja+1];
				var sb = B.rows[ja];
				var eb = B.rows[ja+1];
				for ( var ka = sa; ka < ea; ka++) {
					var rc = A.rows[ka] * n2;
					var aij = A.val[ka];

					for(var kb = sb; kb < eb; kb++) {
						c.val[rc  + B.cols[kb]] += aij * B.val[kb];
					}
				}
			}
		}
		else {
			for ( var jc = 0; jc < n2; jc++) {
				var sb = B.cols[jc];
				var eb = B.cols[jc+1];

				for ( var kb = sb; kb < eb; kb++) {
					var j = B.rows[kb];
					var bj = B.val[kb];

					var s = A.cols[j];
					var e = A.cols[j+1];

					for (var k= s; k < e; k++) {
						c.val[A.rows[k] * n2 + jc] += A.val[k] * bj;
					}
				}
			}
		}
	}
	return c;
}
/**
 * @param{Matrix}
 * @param{spMatrix}
 * @return{Matrix}
 */
function mulMatrixspMatrix (A, B) {
	const m = A.m;
	const n = A.n;
	const n2 = B.n;
	var c = zeros(m, n2);

	if ( B.rowmajor ) {
		for (var ja=0;ja < n; ja++) {
			var sb = B.rows[ja];
			var eb = B.rows[ja+1];
			for ( var i = 0; i < m; i++) {
				var rc = i * n2;
				var aij = A.val[i * n + ja];

				for(var kb = sb; kb < eb; kb++) {
					c.val[rc  + B.cols[kb]] += aij * B.val[kb];
				}
			}
		}
	}
	else {
		for ( var jc = 0; jc < n2; jc++) {
			var sb = B.cols[jc];
			var eb = B.cols[jc+1];

			for ( var kb = sb; kb < eb; kb++) {
				var j = B.rows[kb];
				var bj = B.val[kb];

				for ( i= 0; i < m; i++) {
					c.val[i * n2 + jc] += A.val[i*n + j] * bj;
				}
			}
		}
	}
	return c;
}

/**
 * @param{spMatrix}
 * @param{Matrix}
 * @return{Matrix}
 */
function mulspMatrixMatrix (A, B) {
	const m = A.m;
	const n = A.n;
	const n2 = B.n;
	var c = zeros(m, n2);

	if ( A.rowmajor ) {
		for(var i=0; i < m; i++) {
			var sa = A.rows[i];
			var ea = A.rows[i+1];
			for(var ka = sa; ka < ea; ka++) {
				var ai = A.val[ka];
				var rb = A.cols[ka] * n2;
				var rc = i*n2;
				for ( j=0; j < n2; j++) {
					c.val[rc + j] += ai * B.val[rb + j];
				}
			}
		}
	}
	else {
		for(var j=0; j < n; j++) {
			var s = A.cols[j];
			var e = A.cols[j+1];

			for ( var k= s; k < e; k++) {
				var i = A.rows[k];
				for ( var jc = 0; jc < n2; jc++)
					c.val[i*n2 + jc ] += A.val[k] * B.val[j*n2 + jc];
			}
		}
	}
	return c;
}

/**
 * @param{spVector}
 * @param{spVector}
 * @return{spVector}
 */
function entrywisemulspVectors (a, b) {
	const nnza = a.val.length;
	const nnzb = b.val.length;
	var val = new Array();
	var ind = new Array();

	var ka = 0;
	var kb = 0;
	while ( ka < nnza && kb < nnzb ){
		var i = a.ind[ka];
		while ( b.ind[kb] < i && kb < nnzb)
			kb++;
		if(b.ind[kb] == i) {
			var aibi = a.val[ka] * b.val[kb];
			if ( !isZero(aibi) ) {
				val.push(aibi);
				ind.push(i);
			}
		}
		ka++;
	}
	return new spVector(a.length, val, ind);
}
/**
 * @param{spVector}
 * @param{Float64Array}
 * @return{spVector}
 */
function entrywisemulspVectorVector (a, b) {
	// fast operation but might not yield optimal nnz:
	var c = a.copy();
	const nnz = a.val.length;
	for ( var k = 0; k< nnz; k++) {
		c.val[k] *= b[a.ind[k]];
	}
	return c;
}
/**
 * @param{spMatrix}
 * @param{spMatrix}
 * @return{spMatrix}
 */
function entrywisemulspMatrices (A, B) {
	if ( A.rowmajor ) {
		if ( B.rowmajor ) {
			var val = new Array();
			var cols = new Array();
			var rows = new Uint32Array(A.m+1);
			var ka;
			var kb;
			var i;
			for ( i=0; i < A.m; i++) {
				ka = A.rows[i];
				kb = B.rows[i];
				var ea = A.rows[i+1];
				var eb = B.rows[i+1];
				while ( ka < ea & kb < eb ){
					var j = A.cols[ka];
					while ( B.cols[kb] < j && kb < eb)
						kb++;
					if(B.cols[kb] == j) {
						val.push(A.val[ka] * B.val[kb]);
						cols.push(j);
						rows[i+1]++;
					}
					ka++;
				}
			}
			for(i=1; i < A.m; i++)
				rows[i+1] += rows[i];

			return new spMatrix(A.m, A.n, val, cols, rows);
		}
		else {
			return entrywisemulspMatrixMatrix(B, fullMatrix(A)); // perhaps not the fastest
		}
	}
	else {
		if ( B.rowmajor ) {
			return entrywisemulspMatrixMatrix(A, fullMatrix(B)); // perhaps not the fastest
		}
		else {
			var val = new Array();
			var cols = new Uint32Array(A.n+1);
			var rows = new Array();
			var ka;
			var kb;
			var j;
			for ( j=0; j < A.n; j++) {
				ka = A.cols[j];
				kb = B.cols[j];
				var ea = A.cols[j+1];
				var eb = B.cols[j+1];
				while ( ka < ea & kb < eb ){
					var i = A.rows[ka];
					while ( B.rows[kb] < i && kb < eb)
						kb++;
					if(B.rows[kb] == i) {
						val.push(A.val[ka] * B.val[kb]);
						rows.push(i);
						cols[j+1]++;
					}
					ka++;
				}
			}
			for ( j=1; j< A.n; j++)
				cols[j+1] += cols[j];

			return new spMatrix(A.m, A.n, val, cols, rows);
		}
	}
}
/**
 * @param{spMatrix}
 * @param{Matrix}
 * @return{spMatrix}
 */
function entrywisemulspMatrixMatrix (A, B) {
	var c = A.copy();
	const nnz = A.val.length;
	const n = A.n;
	const m = A.m;
	if ( A.rowmajor ) {
		for ( i=0;i< m; i++) {
			var s = c.rows[i];
			var e = c.rows[i+1];
			var r = i*n;
			for ( var k = s; k< e; k++) {
				c.val[k] *= B.val[r + c.cols[k] ];
			}
		}
	}
	else {
		for ( j=0;j< n; j++) {
			var s = c.cols[j];
			var e = c.cols[j+1];
			for ( var k = s; k< e; k++) {
				c.val[k] *= B.val[c.rows[k] * n + j];
			}
		}
	}
	return c;
}

/**
 * @param{number}
 * @param{spVector}
 * @return{Float64Array}
 */
function addScalarspVector (a, b) {
	const nnzb = b.val.length;
	const n = b.length;
	var c = zeros(n);
	var k;
	for ( k=0;k < n; k++)
		c[k] = a;
	for ( k=0;k < nnzb; k++)
		c[b.ind[k]] += b.val[k];

	return c;
}
/**
 * @param{Float64Array}
 * @param{spVector}
 * @return{Float64Array}
 */
function addVectorspVector (a, b) {
	const nnzb = b.val.length;
	const n = b.length;
	var c = new Float64Array(a);
	for (var k=0;k < nnzb; k++)
		c[b.ind[k]] += b.val[k];

	return c;
}
/**
 * @param{spVector}
 * @param{spVector}
 * @return{spVector}
 */
function addspVectors (a, b) {
	const nnza = a.val.length;
	const nnzb = b.val.length;
	var c = zeros(a.length);
	var k;
	for ( k=0;k < nnza; k++)
		c[a.ind[k]] = a.val[k];
	for ( k=0;k < nnzb; k++)
		c[b.ind[k]] += b.val[k];

	return sparseVector(c);
}

/**
 * @param{number}
 * @param{spMatrix}
 * @return{Matrix}
 */
function addScalarspMatrix (a, B) {
	const nnzb = B.val.length;
	const m = B.m;
	const n = B.n;
	const mn = m*n;

	var C = zeros(m,n);
	var i;
	for (i = 0; i < mn; i++)
		C.val[i] = a;
	if ( B.rowmajor ) {
		var ri = 0;
		for (i = 0; i < m; i++) {
			var s = B.rows[i];
			var e = B.rows[i+1];
			for (var k= s; k < e; k++)
				C.val[ri + B.cols[k]] += B.val[k];
			ri += n;
		}
	}
	else {
		for (i = 0; i < n; i++) {
			var s = B.cols[i];
			var e = B.cols[i+1];
			for (var k= s; k < e; k++)
				C.val[B.rows[k] * n + i] += B.val[k];
		}
	}
	return C;
}
/**
 * @param{Matrix}
 * @param{spMatrix}
 * @return{Matrix}
 */
function addMatrixspMatrix (A, B) {
	const nnzb = B.val.length;
	const m = B.m;
	const n = B.n;
	const mn = m*n;

	var C = matrixCopy(A);
	var i;
	if ( B.rowmajor ) {
		var ri = 0;
		for (i = 0; i < m; i++) {
			var s = B.rows[i];
			var e = B.rows[i+1];
			for (var k= s; k < e; k++)
				C.val[ri + B.cols[k]] += B.val[k];
			ri += n;
		}
	}
	else {
		for (i = 0; i < n; i++) {
			var s = B.cols[i];
			var e = B.cols[i+1];
			for (var k= s; k < e; k++)
				C.val[B.rows[k] * n + i] += B.val[k];
		}
	}
	return C;
}
/**
 * @param{spMatrix}
 * @param{spMatrix}
 * @return{spMatrix}
 */
function addspMatrices (A, B) {
	const nnza = A.val.length;
	const nnzb = B.val.length;
	const m = A.m;
	const n = A.n;

	var C = fullMatrix(A);
	var i;
	if ( B.rowmajor ) {
		var ri = 0;
		for (i = 0; i < m; i++) {
			var s = B.rows[i];
			var e = B.rows[i+1];
			for (var k= s; k < e; k++)
				C.val[ri + B.cols[k]] += B.val[k];
			ri += n;
		}
	}
	else {
		for (i = 0; i < n; i++) {
			var s = B.cols[i];
			var e = B.cols[i+1];
			for (var k= s; k < e; k++)
				C.val[B.rows[k] * n + i] += B.val[k];
		}
	}
	return sparseMatrixRowMajor(C);
}

/** sparse SAXPY : y = y + ax with x sparse and y dense
 * @param {number}
 * @param {spVector}
 * @param {Float64Array}
 */
function spsaxpy ( a, x, y) {
	const nnz = x.val.length;
	for (var k=0;k < nnz; k++)
		y[x.ind[k]] += a * x.val[k];
}

/**
 * @param{number}
 * @param{spVector}
 * @return{Float64Array}
 */
function subScalarspVector (a, b) {
	const nnzb = b.val.length;
	const n = b.length;
	var c = zeros(n);
	var k;
	for ( k=0;k < n; k++)
		c[k] = a;
	for ( k=0;k < nnzb; k++)
		c[b.ind[k]] -= b.val[k];

	return c;
}
/**
 * @param{Float64Array}
 * @param{spVector}
 * @return{Float64Array}
 */
function subVectorspVector (a, b) {
	const nnzb = b.val.length;
	const n = b.length;
	var c = new Float64Array(a);
	for (var k=0;k < nnzb; k++)
		c[b.ind[k]] -= b.val[k];

	return c;
}
/**
 * @param{spVector}
 * @param{Float64Array}
 * @return{Float64Array}
 */
function subspVectorVector (a, b) {
	return subVectors(fullVector(a), b);
}
/**
 * @param{spVector}
 * @param{spVector}
 * @return{spVector}
 */
function subspVectors (a, b) {
	const nnza = a.val.length;
	const nnzb = b.val.length;
	var c = zeros(a.length);
	var k;
	for ( k=0;k < nnza; k++)
		c[a.ind[k]] = a.val[k];
	for ( k=0;k < nnzb; k++)
		c[b.ind[k]] -= b.val[k];

	return sparseVector(c);
}

/**
 * @param{number}
 * @param{spMatrix}
 * @return{Matrix}
 */
function subScalarspMatrix (a, B) {
	const nnzb = B.val.length;
	const m = B.m;
	const n = B.n;
	const mn = m*n;

	var C = zeros(m,n);
	var i;
	for (i = 0; i < mn; i++)
		C.val[i] = a;
	if ( B.rowmajor ) {
		var ri = 0;
		for (i = 0; i < m; i++) {
			var s = B.rows[i];
			var e = B.rows[i+1];
			for (var k= s; k < e; k++)
				C.val[ri + B.cols[k]] -= B.val[k];
			ri += n;
		}
	}
	else {
		for (i = 0; i < n; i++) {
			var s = B.cols[i];
			var e = B.cols[i+1];
			for (var k= s; k < e; k++)
				C.val[B.rows[k] * n + i] -= B.val[k];
		}
	}
	return C;
}
/**
 * @param{spMatrix}
 * @param{Matrix}
 * @return{Matrix}
 */
function subspMatrixMatrix (A, B) {
	return subMatrices(fullMatrix(A), B);
}
/**
 * @param{Matrix}
 * @param{spMatrix}
 * @return{Matrix}
 */
function subMatrixspMatrix (A, B) {
	const nnzb = B.val.length;
	const m = B.m;
	const n = B.n;
	const mn = m*n;

	var C = matrixCopy(A);
	var i;
	if ( B.rowmajor ) {
		var ri = 0;
		for (i = 0; i < m; i++) {
			var s = B.rows[i];
			var e = B.rows[i+1];
			for (var k= s; k < e; k++)
				C.val[ri + B.cols[k]] -= B.val[k];
			ri += n;
		}
	}
	else {
		for (i = 0; i < n; i++) {
			var s = B.cols[i];
			var e = B.cols[i+1];
			for (var k= s; k < e; k++)
				C.val[B.rows[k] * n + i] -= B.val[k];
		}
	}
	return C;
}
/**
 * @param{spMatrix}
 * @param{spMatrix}
 * @return{spMatrix}
 */
function subspMatrices (A, B) {
	const nnza = A.val.length;
	const nnzb = B.val.length;
	const m = A.m;
	const n = A.n;

	var C = fullMatrix(A);
	var i;
	if ( B.rowmajor ) {
		var ri = 0;
		for (i = 0; i < m; i++) {
			var s = B.rows[i];
			var e = B.rows[i+1];
			for (var k= s; k < e; k++)
				C.val[ri + B.cols[k]] -= B.val[k];
			ri += n;
		}
	}
	else {
		for (i = 0; i < n; i++) {
			var s = B.cols[i];
			var e = B.cols[i+1];
			for (var k= s; k < e; k++)
				C.val[B.rows[k] * n + i] -= B.val[k];
		}
	}
	return sparseMatrixRowMajor(C);
}

/**
 * @param{function}
 * @param{spVector}
 * @return{Float64Array}
 */
function applyspVector( f, x ) {
	const nnz = x.val.length;
	const n = x.length;
	var res = new Float64Array(n);
	var i;
	const f0 = f(0);
	for ( i=0; i< n; i++)
		res[i] = f0;
	for ( i=0; i< nnz; i++)
		res[x.ind[i]] = f(x.val[i]);
	return res;
}
/**
 * @param{function}
 * @param{spMatrix}
 * @return{Matrix}
 */
function applyspMatrix( f, X ) {
	const nnz = X.val.length;
	const m = X.m;
	const n = X.n;
	const mn = m*n;
	const f0 = f(0);
	var C = zeros(m,n);
	var i;
	if ( !isZero(f0) ) {
		for (i = 0; i < mn; i++)
			C.val[i] = f0;
	}
	if ( X.rowmajor ) {
		var ri = 0;
		for (i = 0; i < m; i++) {
			var s = X.rows[i];
			var e = X.rows[i+1];
			for (var k= s; k < e; k++)
				C.val[ri + X.cols[k]] = f(X.val[k]);
			ri += n;
		}
	}
	else {
		for (i = 0; i < n; i++) {
			var s = X.cols[i];
			var e = X.cols[i+1];
			for (var k= s; k < e; k++)
				C.val[X.rows[k] * n + i] += f(X.val[k]);
		}
	}
	return C;
}
/**
 * @param{spVector}
 * @return{number}
 */
function sumspVector( a ) {
	return sumVector(a.val);
}
/**
 * @param{spMatrix}
 * @return{number}
 */
function sumspMatrix( A ) {
	return sumVector(A.val);
}
/**
 * @param{spMatrix}
 * @return{Matrix}
 */
function sumspMatrixRows( A ) {
	var res = zeros(A.n);
	if ( A.rowmajor ) {
		for ( var k=0; k < A.val.length; k++)
			res[A.cols[k]] += A.val[k];
	}
	else {
		for ( var i=0; i<A.n; i++)
			res[i] = sumspVector(A.col(i));
	}
	return new Matrix(1,A.n, res, true);
}
/**
 * @param{spMatrix}
 * @return{Float64Array}
 */
function sumspMatrixCols( A ) {
	var res = zeros(A.m);
	if ( A.rowmajor ) {
		for ( var i=0; i<A.m; i++)
			res[i] = sumspVector(A.row(i));
	}
	else {
		for ( var k=0; k < A.val.length; k++)
			res[A.rows[k]] += A.val[k];
	}
	return res;
}
/**
 * @param{spMatrix}
 * @return{Matrix}
 */
function prodspMatrixRows( A ) {
	if ( A.rowmajor ) {
		var res = ones(A.n);
		for ( var i=0; i < A.m; i++) {
			var s = A.rows[i];
			var e = A.rows[i+1];
			for ( var j=0; j < A.n; j++)
				if ( A.cols.subarray(s,e).indexOf(j) < 0 )
					res[j] = 0;
			for ( var k=s; k < e; k++)
				res[A.cols[k]] *= A.val[k];
		}
	}
	else {
		var res = zeros(A.n);
		for ( var i=0; i<A.n; i++) {
			var a = A.col(i);
			if ( a.val.length == a.length )
				res[i] = prodVector(a.val);
		}
	}
	return new Matrix(1,A.n, res, true);
}
/**
 * @param{spMatrix}
 * @return{Float64Array}
 */
function prodspMatrixCols( A ) {
	if ( A.rowmajor ) {
		var res = zeros(A.m);
		for ( var i=0; i<A.m; i++) {
			var a = A.row(i);
			if ( a.val.length == a.length )
				res[i] = prodVector(a.val);
		}
	}
	else {
		var res = ones(A.m);
		for ( var j=0; j < A.n; j++) {
			var s = A.cols[j];
			var e = A.cols[j+1];
			for ( var i=0; i < A.m; i++)
				if ( A.rows.subarray(s,e).indexOf(i) < 0 )
					res[i] = 0;
			for ( var k=s; k < e; k++)
				res[A.rows[k]] *= A.val[k];
		}
	}
	return res;
}


///////////////////////////
/// Sparse linear systems
///////////////////////////
/** Sparse Conjugate gradient method for solving the symmetric positie definite system Ax = b
 * @param{spMatrix}
 * @param{Float64Array}
 * @return{Float64Array}
 */
function spsolvecg ( A, b) {

	const n = A.n;
	const m = A.m;

	var x = randn(n);
	var r = subVectors(b, mulspMatrixVector(A, x));
	var rhoc = dot(r,r);
	const TOL = 1e-8;
	var delta2 = TOL * norm(b);
	delta2 *= delta2;

	// first iteration:
	var p = vectorCopy(r);
	var w = mulspMatrixVector(A,p);
	var mu = rhoc / dot(p, w);
	saxpy( mu, p, x);
	saxpy( -mu, w, r);
	var rho_ = rhoc;
	rhoc = dot(r,r);

	var k = 1;

	var updateP = function (tau, r) {
		for ( var i=0; i < m; i++)
			p[i] = r[i] + tau * p[i];
	}

	while ( rhoc > delta2 && k < n ) {
		updateP(rhoc/rho_, r);
		w = mulspMatrixVector(A,p);
		mu = rhoc / dot(p, w);
		saxpy( mu, p, x);
		saxpy( -mu, w, r);
		rho_ = rhoc;
		rhoc = dot(r,r);
		k++;
	}
	return x;
}
/** Sparse Conjugate gradient normal equation residual method for solving the rectangular system Ax = b
 * @param{spMatrix}
 * @param{Float64Array}
 * @return{Float64Array}
 */
function spcgnr ( A, b) {
/*
TEST
A = randnsparse(0.3,10000,1000)
x = randn(1000)
b = A*x + 0.01*randn(10000)
tic()
xx = cgnr(A,b)
t1 = toc()
ee = norm(A*xx - b)
tic()
xh=spcgnr(sparse(A), b)
t2 = toc()
e = norm(A*xh - b)
*/

	const n = A.n;
	const m = A.m;

	var x = randn(n);
	var r = subVectors(b, mulspMatrixVector(A, x));
	const TOL = 1e-8;
	var delta2 = TOL * norm(b);
	delta2 *= delta2;

	// first iteration:
	var z = mulspMatrixTransVector(A, r);
	var rhoc = dot(z,z);
	var p = vectorCopy(z);
	var w = mulspMatrixVector(A,p);
	var mu = rhoc / dot(w, w);
	saxpy( mu, p, x);
	saxpy( -mu, w, r);
	z = mulspMatrixTransVector(A, r);
	var rho_ = rhoc;
	rhoc = dot(z,z);

	var k = 1;

	var updateP = function (tau, z) {
		for ( var i=0; i < m; i++)
			p[i] = z[i] + tau * p[i];
	}

	while ( rhoc > delta2 && k < n ) {
		updateP(rhoc/rho_, z);
		w = mulspMatrixVector(A,p);
		mu = rhoc / dot(w, w);
		saxpy( mu, p, x);
		saxpy( -mu, w, r);
		z = mulspMatrixTransVector(A, r);
		rho_ = rhoc;
		rhoc = dot(z,z);
		k++;
	}
	return x;
}



/////////////////////////////////////////:
//// Unconstrained Minimization
/////////////////////////////////////////
function minimize( f, grad, x0 ) {
/*
function loss(x) {
return (norm(b - A*x)^2)
}
function grad(x) {
return (2*A'*A*x - 2*A'*b)
}
x = randn(10)
A = randn(100,10)
b = A*x + 0.01*randn(100)
xh = minimize(A.n, loss, grad)
norm(x - xh)
*/
	var x;
	var n = 1; // dimension of x

	if ( arguments.length == 3 ) {
		if ( typeof(x0) == "number" ) {
			if( x0 > 0 && Math.floor(x0) == x0 ) {
				n = x0;
				x = sub(mul(20,rand(n)), 10);
			}
			else {
				n = 1;
				x = x0;
			}
		}
		else {
			n = x0.length;
			x = x0;
		}
	}
	else {
		n = 1;
		x = 20 * Math.random() - 10;
	}

	if ( n == 1 )
		return secant(f, grad, x);
	else if ( n > 500 )
		return steepestdescent(f, grad, x);
	else
		return bfgs(f, grad, x);
}

function secant( f, grad, x0 ) {
	// for a unidimensional function f
	// find a root to f'(x) = 0 with the secant method
	const TOLx = 1e-6;

	var x = x0;
	var g = grad(x);
	var dx = -0.01*g;
	x += dx;
	var gprev,dg;
	do {
		gprev = g;
		g = grad(x);
		dg = g-gprev;

		dx *= -g / dg;
		x += dx;

	} while ( Math.abs(dx) > TOLx);
	return x;
}


function steepestdescent(f, grad, x0) {
	// assume x is a vector

	const TOLobj = 1e-8;
	const TOLx = 1e-6;
	const TOLgrad = 1e-4;

	var x = x0;
	var xprev;
	var obj = f(x);
	var g = grad(x);
	var normg = norm(g);
	var iter = 0;
	do {

		// line search
		var linesearch = armijo(f, x, obj, g, normg);

		// take the step
		xprev = vectorCopy(x);
		prevobj = obj;
		x = linesearch.x;
		obj = linesearch.obj;
		g = grad(x);
		normg = norm(g);

		iter++;
		//console.log(linesearch.lambda, x, obj, g);
	} while ( normg > TOLgrad && prevobj - obj > TOLobj && norm(subVectors(x, xprev) ) > TOLx ) ;
	console.log(" OBJ: " + obj + ", norm(grad): " + normg, "prevobj - obj", prevobj - obj, "iter: ", iter );
	return x;
}

function bfgs( f, grad, x0 ) {
	// assume x is a vector

	const n = x0.length;
	const TOLobj = 1e-8;
	const TOLx = 1e-6;
	const TOLgrad = 1e-4;

	var x = x0;
	var xprev;
	var obj = f(x);
	var H = eye(n);
	var g,direction, delta, gamma, ls;
	var normg;
	var Hgamma;
	var dH;
	var iter = 0;
	do {
		g = grad(x);
		normg = norm(g);
		direction = minusVector( mulMatrixVector(H, g ) );

		// line search
		var linesearch = armijodir (f, x, obj, g, direction );

		// take the step
		xprev = vectorCopy(x);
		prevobj = obj;
		x = linesearch.x;
		obj = linesearch.obj;

		// update Hessian inverse approximation
		delta = subVectors(x,xprev);
		gamma = subVectors(grad(x) , g);

		Hgamma = mulMatrixVector(H, gamma);

		var deltagamma = dot(delta,gamma);
		var delta_ = mulScalarVector(1/deltagamma, delta);

		var deltagammaH = outerprodVectors(delta_, Hgamma);

		dH = subMatrices(outerprodVectors(delta_, delta, 1+ dot(gamma, Hgamma)/deltagamma) , addMatrices(deltagammaH, transposeMatrix(deltagammaH) ) );
		//--

		H = add(H, dH);

		iter++;

	} while ( normg > TOLgrad && prevobj - obj > TOLobj && norm(subVectors(x, xprev) ) > TOLx ) ;
	console.log(" OBJ: " + obj + ", norm(grad): " + normg, "prevobj - obj", prevobj - obj, "iters: ", iter );
	return x;
}


/**
 * Return minimizer of p(x) = p0 + p1 x + p2 x^2 + p3 x^3 with p(x1) = px1, p(x2) = px2
 * within [lb, ub]
 *
 * @param {number}
 * @param {number}
 * @param {number}
 * @param {number}
 * @param {number}
 * @param {number}
 * @param {number}
 * @param {number}
 * @return {number}
 */
function mincubic(p0, p1, x1, px1, x2, px2, lb, ub) {

	const x1square = x1*x1;
	const x2square = x2*x2;

	var A = new Matrix(2,2, [x1square, x1*x1square, x2square, x2*x2square]);
	var b = new Float64Array([px1 - p0 - p1*x1, px2 - p0 - p1*x2]);
    var c = solve(A,b);
    var x = (-c[0] + Math.sqrt(c[0]*c[0] - 3 *c[1] * p1))/(3*c[1]);

    return Math.min(ub, Math.max(lb, x));
}
/**
 * Return minimizer of p(x) = p0 + p1 x + p2 x^2 with p(x1) = px1 (x1 ~ 1)
 * within [lb, ub]
 *
 * @param {number}
 * @param {number}
 * @param {number}
 * @param {number}
 * @param {number}
 * @param {number}
 * @return {number}
 */
function minquadratic(p0, p1, px1, x1, lb, ub) {
    var x = - p1/(2 * x1 * (px1 - p0 - p1) );
    return Math.min(ub, Math.max(lb, x));
}

/**
 * Armijo line search with objective function f
 * and starting point xc, fc, g
 *
 * @param {function}
 * @param {{Float64Array|number}}
 * @param {number}
 * @param {{Float64Array|number}}
 * @param {number}
 * @return {{Float64Array|number}}
 */
function armijo (f, xc, fc, g, normg ) {
	// Armijo's rule line search in the direction of gradient g
	const alpha = 0.0001;
	const blow = 0.1;
	const bhigh = 0.5;
	const normg2 = normg * normg;

	var lambda = Math.min(1,100/(1+normg));
	var fgoal = fc - alpha * lambda * normg2;

    var lambda1 = lambda;
    var xt = subVectors(xc, mulScalarVector(lambda, g) );
    var ft_1 = fc;
    var ft = f(xt);

    var iter = 1;

	// first iter
    lambda = minquadratic(fc, -normg2, lambda1, ft, blow*lambda1, bhigh*lambda1);
	var ft_1 = ft;
	var lambda2 = lambda1;
	lambda1 = lambda;

    iter++;
    // next iterations
	while(ft > fgoal && iter <= 10) {

		lambda = mincubic(fc, -normg2, lambda1, ft, lambda2, ft_1, blow*lambda1, bhigh*lambda1);
		lambda2 = lambda1;
		lambda1 = lambda;

		xt = subVectors(xc, mulScalarVector(lambda, g) );
		ft_1 = ft;
		ft = f(xt);

		fgoal = fc - alpha * lambda * normg2;

		iter++;
	}
	return {"lambda": lambda, "x": xt, "obj": ft};
}
function armijodir (f, xc, fc, g, d ) {
	// Armijo's rule line search in the direction d
	const alpha = 0.0001;
	const blow = 0.1;
	const bhigh = 0.5;
	const p1 = dot( g, d);

	var lambda = Math.min(1,100/(1+norm(g)));
	var fgoal = fc + alpha * lambda * p1;

    var lambda1 = lambda;
    var xt = addVectors(xc, mulScalarVector(lambda, d) );
    var ft_1 = fc;
    var ft = f(xt);

    var iter = 1;

	// first iter
    lambda = minquadratic(fc, p1, lambda1, ft, blow*lambda1, bhigh*lambda1);
	var ft_1 = ft;
	var lambda2 = lambda1;
	lambda1 = lambda;

    iter++;
    // next iterations
	while(ft > fgoal && iter <= 10) {

		lambda=mincubic(fc, p1, lambda1, ft, lambda2, ft_1, blow*lambda1, bhigh*lambda1 );
		lambda2 = lambda1;
		lambda1 = lambda;

		xt = addVectors(xc, mulScalarVector(lambda, d) );
		ft_1 = ft;
		ft = f(xt);

		fgoal = fc + alpha * lambda * p1;

		iter++;
	}
	return {"lambda": lambda, "x": xt, "obj": ft};
}


/**
 * Number of combinations of k items among n
 * @param{number}
 * @param{number}
 * @return{number}
 */
function nchoosek(n,k) {
	if ( k > n || k < 0 || n < 0)
		return 0;

	var i;
	var res = 1;
	for ( i=n-k+1; i <= n; i++)
		res *= i;
	for (i=2; i <= k; i++)
		res /= i;
	return res;
}

//////////////////////////////////////////////
//  Multivariate Gaussian random vectors
//////////////////////////////////////////////
function mvnrnd(mu, Sigma, N) {
	if ( arguments.length < 3 )
		var N = 1;

	var X = randn(N,mu.length);

	if ( issymmetric(Sigma) )
		var L = chol(Sigma);
	else
		var L = Sigma; // L directly provided instead of Sigma

	return add(mul(ones(N),transpose(mu)), mul(X, transpose(L) ));
}

//////////////////////////////////////////////
// Generic class for Distributions
/////////////////////////////////////////////
function Distribution (distrib, arg1, arg2 ) {

	if ( arguments.length < 1 ) {
		error("Error in new Distribution(name): name is undefined.");
		return undefined;
	}

	if (typeof(distrib) == "string")
		distrib = eval(distrib);

	this.type = "Distribution:" + distrib.name;

	this.distribution = distrib.name;

	// Functions that depend on the distrib:
	this.construct = distrib.prototype.construct;

	this.estimate = distrib.prototype.estimate;
	this.sample = distrib.prototype.sample;
	this.pdf = distrib.prototype.pdf;
	if( distrib.prototype.pmf )
		this.pmf = distrib.prototype.pmf;

	if( distrib.prototype.logpdf )
		this.logpdf = distrib.prototype.logpdf;
	else
		this.logpdf = function ( x ) { return log(this.pdf(x)); };

//	this.cdf = distrib.prototype.cdf;

	// Initialization depending on distrib
	this.construct(arg1, arg2);
}

Distribution.prototype.construct = function ( params ) {
	// Read params and create the required fields for a specific algorithm

}

Distribution.prototype.pdf = function ( x ) {
	// return value of PDF at x
}

Distribution.prototype.sample = function ( N ) {
	// Return N samples
}

Distribution.prototype.estimate = function ( X ) {
	// Estimate dsitribution from the N-by-d matrix X
	// !! this function should also update this.mean and this.variance
}


Distribution.prototype.info = function () {
	// Print information about the distribution

	var str = "{<br>";
	var i;
	var Functions = new Array();
	for ( i in this) {
		switch ( type( this[i] ) ) {
			case "string":
			case "boolean":
			case "number":
				str += i + ": " + this[i] + "<br>";
				break;
			case "vector":
				str += i + ": " + printVector(this[i]) + "<br>";
				break;
			case "matrix":
				str += i + ": matrix of size " + this[i].m + "-by-" + this[i].n + "<br>";
				break;
			case "function":
				Functions.push( i );
				break;
			default:
				str += i + ": " + typeof(this[i]) + "<br>";
				break;
		}
	}
	str += "<i>Functions: " + Functions.join(", ") + "</i><br>";
	str += "}";
	return str;
}


///////////////////////////////
///  Uniform
///////////////////////////////
function Uniform ( params ) {
	var that = new Distribution ( Uniform, params ) ;
	return that;
}


Uniform.prototype.construct = function ( a, b ) {
	// Read params and create the required fields for a Uniform distribution
	if ( typeof(a) == "undefined" ) {
		// default to continuous uniform in [-1,1];
		this.isDiscrete = false;
		this.a = -1;
		this.b = 1;
		this.dimension = 1;

		this.px = 0.5;
		this.mean = 0;
		this.variance = 1/3;
		this.std = Math.sqrt(this.variance);
	}
	else {
		if ( typeof(b) == "undefined" ) {
			this.isDiscrete = true;
			if ( typeof(a) == "number")
				this.values = range(a);
			else
				this.values = a;
			this.dimension = 1;
			this.mean = ( min(this.values) + max(this.values) ) / 2;
			this.variance = (this.values.length * this.values.length - 1 ) / 12;
			this.std = Math.sqrt(this.variance);
		}
		else {
			this.isDiscrete = false;
			this.a = a;
			this.b = b;
			this.dimension = size(a,1);

			this.px = 1 / prod(sub(b,a));
			this.mean = mul(0.5, add(a, b));
			var b_a = sub(b,a);
			this.variance = entrywisediv( entrywisemul(b_a,b_a), 12);
			this.std = sqrt(this.variance);
		}
	}
}

Uniform.prototype.pdf = function ( x ) {
	// return value of PDF at x
	const tx = type(x);
	var p = undefined;
	if (this.isDiscrete) {
		var pdfscalar = function ( s, values ) {
			return ( values.indexOf(s) < 0 ) ? 0 : (1/values.length) ;
		};

		if ( tx == "number" ) {
			p = pdfscalar(x, this.values);
		}
		else if ( tx == "vector" ) {
			p = zeros(x.length);
			for ( var i=0; i < x.length; i++)
				p[i] = pdfscalar(x[i], this.values);
		}
		else if ( tx == "matrix" ) {
			p = zeros(x.m, x.n);
			for ( var i=0; i < x.m*x.n; i++)
				p.val[i] = pdfscalar(x.val[i], this.values);
		}
	}
	else {
		var pdfscalar = function ( s , l, u, px) {
			return ( s >= l && s <= u ) ? px : 0;
		};

		if ( tx == "number" ) {
			if ( this.dimension == 1 )
				p = pdfscalar(x, this.a, this.b, this.px);
		}
		else if ( tx == "vector" ) {
			if ( this.dimension == 1 ) {
				p = zeros(x.length);
				for ( var i=0; i < x.length; i++)
					p[i] = pdfscalar(x[i], this.a, this.b, this.px);
			}
			else if ( this.dimension == x.length ) {
				p = pdfscalar(x[0], this.a[0], this.b[0], this.px);
				var k = 1;
				while ( k < x.length && p != 0 ) {
					p *= pdfscalar(x[k], this.a[k], this.b[k], this.px);
					k++;
				}
			}
		}
		else if ( tx == "matrix" ) {
			if ( this.dimension == 1 ) {
				p = zeros(x.m, x.n);
				for ( var i=0; i < x.m*x.n; i++)
					p.val[i] = pdfscalar(x.val[i], this.a, this.b, this.px);
			}
			else if ( this.dimension == x.n ) {
				p = zeros(x.m);
				for ( var i=0; i < x.m; i++) {
					p[i] = pdfscalar(x.val[i*x.n], this.a[0], this.b[0], this.px);
					var k = 1;
					while ( k < x.n && p[i] != 0 ) {
						p[i] *= pdfscalar(x.val[i*x.n+k], this.a[k], this.b[k], this.px);
						k++;
					}
				}
			}
		}
	}
	return p;
}
Uniform.prototype.sample = function ( N ) {
	// Return N samples
	if ( typeof(N) == "undefined" )
		var N = 1;

	if ( this.isDiscrete ) {
		var s = zeros(N);
		for(var i=0; i < N; i++) {
			var r = Math.random();
			var k = 1;
			var n = this.values.length;
			while ( r > k / n )
				k++;
			s[i] = this.values[k-1];
		}
		if ( N == 1)
			return s[0];
		else
			return s;
	}
	else {
		if ( this.dimension == 1 )
			return add(entrywisemul(this.b-this.a, rand(N)), this.a);
		else {
			return add(entrywisemul(outerprod(ones(N), sub(this.b,this.a)), rand(N, this.dimension)), outerprod(ones(N),this.a) );
		}
	}
}

Uniform.prototype.estimate = function ( X ) {
	// Estimate dsitribution from the N-by-d matrix X
	const tX = type(X);

	// Detect if X contains discrete or continuous values
	if ( tX == "matrix" )
		var x = X.val;
	else
		var x = X;

	var i = 0;
	while ( i < x.length && Math.round(x[i]) == x[i] )
		i++;
	if ( i < x.length )
		this.isDiscrete = false;
	else
		this.isDiscrete = true;

	// Estimate
	if ( this.isDiscrete) {
		for ( i = 0; i < x.length; i++ ) {
			var xi = Math.round(x[i]);
			if ( this.values.indexOf(xi) < 0 )
				this.values.push(xi);
		}
		this.dimension = 1;
		this.mean = ( min(this.values) + max(this.values) ) / 2;
		this.variance = (this.values.length * this.values.length - 1 ) / 12;
		this.std = Math.sqrt(this.variance);
	}
	else {
		if ( tX == "matrix" ) {
			this.a = min(X,1).val;
			this.b = max(X).val;
			this.dimension = this.a.length;
		}
		else {
			this.a = minVector(X);
			this.b = maxVector(X);
			this.dimension = 1;
		}
		this.mean = mul(0.5, add(this.a, this.b));
		var b_a = sub(this.b,this.a);
		this.variance = entrywisediv( entrywisemul(b_a,b_a), 12);
		this.std = sqrt(this.variance);
		this.px = 1 / prod(sub(this.b,this.a));
	}
	return this;
}


///////////////////////////////
///  Gaussian
/// (with independent components in multiple dimension)
///////////////////////////////
function Gaussian ( params ) {
	var that = new Distribution ( Gaussian, params ) ;
	return that;
}


Gaussian.prototype.construct = function ( mean, variance ) {
	// Read params and create the required fields for a specific algorithm
	if ( typeof(mean) == "undefined" )
		var mu = 1;

	else if ( type(mean) == "matrix")
		var mu = mean.val;
	else
		var mu = mean;

	var dim = size(mu,1) ;

	if ( typeof(variance) == "undefined") {
		if ( dim == 1)
			var variance = 1;
		else
			var variance = ones(dim);
	}

	this.mean = mu;
	this.variance = variance;
	this.std = sqrt(this.variance);
	this.dimension = dim;
}

Gaussian.prototype.pdf = function ( x ) {
	// return value of PDF at x
	if ( this.dimension == 1 ) {
		if ( typeof(x) == "number") {
			var diff = x - this.mean;
			return Math.exp(-diff*diff / (2*this.variance)) / (this.std * Math.sqrt(2*Math.PI) );
		}
		else {
			var diff = sub(x, this.mean);
			return entrywisediv ( exp( entrywisediv(entrywisemul( diff, diff), -2* this.variance) ), this.std * Math.sqrt(2*Math.PI) ) ;
		}
	}
	else {
		if ( type(x) == "vector") {
			if (x.length != this.dimension ) {
				error ( "Error in Gaussian.pdf(x): x.length = " + x.length + " != " + this.dimension + " = Gaussian.dimension.");
				return undefined;
			}
			var diff = subVectors(x, this.mean );
			var u = -0.5 * dot( diff, divVectors(diff, this.variance) );
			return Math.exp(u) /  ( Math.pow(2*Math.PI, 0.5*this.dimension) * Math.sqrt(prodVector(this.variance)) );
		}
		else {
			if (x.n != this.dimension ) {
				error ( "Error in Gaussian.pdf(X): X.n = " + x.n + " != " + this.dimension + " = Gaussian.dimension.");
				return undefined;
			}

			var p = zeros(x.m);
			var denominator = Math.pow(2*Math.PI, 0.5*this.dimension) * Math.sqrt(prodVector(this.variance)) ;
			for ( var i=0; i < x.m; i++) {
				var diff = subVectors(x.row(i), this.mean );
				var u = -0.5 * dot( diff, divVectors(diff, this.variance) );
				p[i] = Math.exp(u) / denominator;
			}
			return p;
		}
	}
}

Gaussian.prototype.sample = function ( N ) {
	// Return N samples
	if ( typeof(N) == "undefined")
		var N = 1;

	if ( N == 1 )
		var X = add(entrywisemul(this.std, randn(this.dimension)), this.mean);
	else {
		var N1 = ones(N);
		var X = add(entrywisemul(outerprod(N1, this.std), randn(N,this.dimension)), outerprod(N1,this.mean));
	}
	return X;
}

Gaussian.prototype.estimate = function ( X ) {
	// Estimate dsitribution from the N-by-d matrix X
	if ( type ( X ) == "matrix" ) {
		this.mean = mean(X,1).val;
		this.variance = variance(X,1).val;
		this.std = undefined;
		this.dimension = X.n;
	}
	else {
		this.mean = mean(X);
		this.variance = variance(X);
		this.std = Math.sqrt(this.variance);
		this.dimension = 1;
	}
	return this;
}
///////////////////////////////
///  Gaussian
/// (with independent components in multiple dimension)
///////////////////////////////
function mvGaussian ( params ) {
	var that = new Distribution ( mvGaussian, params ) ;
	return that;
}


mvGaussian.prototype.construct = function ( mean, covariance ) {
	// Read params and create the required fields for a specific algorithm
	if ( typeof(mean) == "undefined" )
		var mu = 1;

	else if ( type(mean) == "matrix")
		var mu = mean.val;
	else
		var mu = mean;

	var dim = size(mu,1) ;

	if ( typeof(covariance) == "undefined") {
		if ( dim == 1)
			var covariance = 1;
		else
			var covariance = eye(dim);
	}

	this.mean = mu;
	this.variance = covariance;
	this.dimension = dim;

	this.L = chol(this.variance);
	if ( typeof(this.L) == "undefined" )
		error("Error in new Distribution (mvGaussian, mu, Sigma): Sigma is not positive definite");

	this.det = det(this.variance);
}

mvGaussian.prototype.pdf = function ( x ) {
	// return value of PDF at x
	if ( this.dimension == 1 ) {
		if ( typeof(x) == "number") {
			var diff = x - this.mean;
			return Math.exp(-diff*diff / (2*this.variance)) / (Math.sqrt(2*this.variance*Math.PI) );
		}
		else {
			var diff = sub(x, this.mean);
			return entrywisediv ( exp( entrywisediv(entrywisemul( diff, diff), -2* this.variance) ), Math.sqrt(2*this.variance*Math.PI) ) ;
		}
	}
	else {
		if ( type(x) == "vector") {
			if (x.length != this.dimension ) {
				error ( "Error in mvGaussian.pdf(x): x.length = " + x.length + " != " + this.dimension + " = mvGaussian.dimension.");
				return undefined;
			}
			var diff = subVectors(x, this.mean );
			var u = -0.5 * dot( diff, cholsolve(this.L, diff) );
			return Math.exp(u) /   Math.sqrt( Math.pow(2*Math.PI, this.dimension) * this.det ) ;
		}
		else {
			if (x.n != this.dimension ) {
				error ( "Error in Gaussian.pdf(X): X.n = " + x.n + " != " + this.dimension + " = Gaussian.dimension.");
				return undefined;
			}

			var p = zeros(x.m);
			var denominator = Math.sqrt( Math.pow(2*Math.PI, this.dimension) * this.det ) ;
			for ( var i=0; i < x.m; i++) {
				var diff = subVectors(x.row(i), this.mean );
				var u = -0.5 * dot( diff, cholsolve(this.L, diff) );
				p[i] = Math.exp(u) / denominator;
			}
			return p;
		}
	}
}

mvGaussian.prototype.sample = function ( N ) {
	// Return N samples
	if ( typeof(N) == "undefined")
		var N = 1;

	var X = add(mul(randn(N,this.dimension), transpose(this.L)), outerprod(ones(N),this.mean));

	if ( N == 1)
		return X.val;
	else
		return X;
}

mvGaussian.prototype.estimate = function ( X ) {
	// Estimate dsitribution from the N-by-d matrix X
	if ( type ( X ) == "matrix" ) {
		this.mean = mean(X,1).val;
		this.variance = cov(X);
		this.dimension = X.n;
		this.L = chol(this.variance);
		if ( typeof(this.L) == "undefined" )
			error("Error in mvGaussian.estimate(X): covariance estimate is not positive definite");

		this.det = det(this.variance);
		return this;
	}
	else {
		error("mvGaussian.estimate( X ) needs a matrix X");
	}
}



///////////////////////////////
///  Bernoulli
///////////////////////////////
function Bernoulli ( params ) {
	var that = new Distribution ( Bernoulli, params ) ;
	return that;
}


Bernoulli.prototype.construct = function ( mean ) {
	// Read params and create the required fields for a specific algorithm
	if ( typeof(mean) == "undefined" )
		var mean = 0.5;

	var dim = size(mean,1);

	this.mean = mean;
	this.variance = entrywisemul(mean, sub(1, mean)) ;
	this.std = sqrt(this.variance);
	this.dimension = dim;
}

Bernoulli.prototype.pdf = Bernoulli.prototype.pmf = function ( x ) {
	// return value of PDF at x
	const tx = type(x);

	var pdfscalar = function ( s, mu ) {
		if ( s == 1 )
			return mu;
		else if ( s == 0)
			return (1-mu);
		else
			return 0;
	};

	if ( this.dimension == 1 ) {
		if ( tx == "number" ) {
			return pdfscalar(x, this.mean);
		}
		else if ( tx == "vector") {
			var p = zeros(x.length);
			for(var i = 0; i < x.length ; i++){
				p[i] = pdfscalar(x[i], this.mean);
			}
			return p;
		}
		else if ( tx == "matrix") {
			var P = zeros(x.m, x.n);
			var mn = x.m*x.n;
			for(var k = 0; k < mn ; k++){
				P.val[k] = pdfscalar(x.val[k], this.mean);
			}
			return P;
		}
	}
	else {
		switch( tx ) {
		case "vector":
			var p = pdfscalar(x[0], this.mean[0]);
			for (var k = 1; k < this.dimension; k++)
				p *= pdfscalar(x[k], this.mean[k]);
			break;

		case "spvector":
			var p = 1;
			for (var j=0; j < x.ind[0] ; j++)
				p *= (1-this.mean[j]);
			for (var k =0; k < x.val.length - 1; k++) {
				p *= this.mean[x.ind[k]];
				for (var j=x.ind[k]+1; j < x.ind[k+1] ; j++)
					p *= (1-this.mean[j]);
			}
			p *= this.mean[x.ind[k]];
			for (var j=x.ind[k]+1; j < this.dimension ; j++)
				p *= (1-this.mean[j]);
			break;

		case "matrix":
			var p = zeros(x.m);
			for (var i=0; i < x.m; i++) {
				p[i] = pdfscalar(x.val[i*x.n], this.mean[0]);
				for (var k = 1; k < x.n; k++)
					p[i] *= pdfscalar(x.val[i*x.n + k], this.mean[k]);
			}
			break;
		case "spmatrix":
			var p = ones(x.m);
			for (var i=0; i < x.m; i++) {
				var xr = x.row(i);	// could be faster without this...
				for (var j=0; j < xr.ind[0] ; j++)
					p[i] *= (1-this.mean[j]);
				for (var k =0; k < xr.val.length - 1; k++) {
					p[i] *= this.mean[xr.ind[k]];
					for (var j=xr.ind[k]+1; j < xr.ind[k+1] ; j++)
						p[i] *= (1-this.mean[j]);
				}
				p[i] *= this.mean[xr.ind[k]];
				for (var j=xr.ind[k]+1; j < this.dimension ; j++)
					p[i] *= (1-this.mean[j]);
			}
			break;
		default:
			var p = undefined;
			break;
		}
		return p;
	}

}

Bernoulli.prototype.logpdf = Bernoulli.prototype.logpmf = function ( x ) {
	// return value of logPDF at x
	const tx = type(x);

	var logpdfscalar = function ( s, mu ) {
		if ( s == 1 )
			return Math.log(mu);
		else if ( s == 0)
			return Math.log(1-mu);
		else
			return -Infinity;
	};

	if ( this.dimension == 1 ) {
		if ( tx == "number" ) {
			return logpdfscalar(x, this.mean);
		}
		else if ( tx == "vector") {
			var p = zeros(x.length);
			for(var i = 0; i < x.length ; i++){
				p[i] = logpdfscalar(x[i], this.mean);
			}
			return p;
		}
		else if ( tx == "matrix") {
			var P = zeros(x.m, x.n);
			var mn = x.m*x.n;
			for(var k = 0; k < mn ; k++){
				P.val[k] = logpdfscalar(x.val[k], this.mean);
			}
			return P;
		}
	}
	else {
		switch( tx ) {
		case "vector":
			var p = 0;
			for (var k = 0; k < this.dimension; k++)
				p += logpdfscalar(x[k], this.mean[k]);
			break;

		case "spvector":
			var p = 0;
			for (var j=0; j < x.ind[0] ; j++)
				p += Math.log(1-this.mean[j]);
			for (var k =0; k < x.val.length - 1; k++) {
				p += Math.log(this.mean[x.ind[k]]);
				for (var j=x.ind[k]+1; j < x.ind[k+1] ; j++)
					p += Math.log(1-this.mean[j]);
			}
			p += Math.log(this.mean[x.ind[k]]);
			for (var j=x.ind[k]+1; j < this.dimension ; j++)
				p += Math.log(1-this.mean[j]);
			break;

		case "matrix":
			var p = zeros(x.m);
			for (var i=0; i < x.m; i++) {
				for (var k = 0; k < x.n; k++)
					p[i] += logpdfscalar(x.val[i*x.n + k], this.mean[k]);
			}
			break;
		case "spmatrix":
			var p = zeros(x.m);
			for (var i=0; i < x.m; i++) {
				var xr = x.row(i);	// could be faster without this...
				for (var j=0; j < xr.ind[0] ; j++)
					p[i] += Math.log(1-this.mean[j]);
				for (var k =0; k < xr.val.length - 1; k++) {
					p[i] += Math.log(this.mean[xr.ind[k]]);
					for (var j=xr.ind[k]+1; j < xr.ind[k+1] ; j++)
						p[i] += Math.log(1-this.mean[j]);
				}
				p[i] += Math.log(this.mean[xr.ind[k]]);
				for (var j=xr.ind[k]+1; j < this.dimension ; j++)
					p[i] += Math.log(1-this.mean[j]);
			}
			break;
		default:
			var p = undefined;
			break;
		}
		return p;
	}

}

Bernoulli.prototype.sample = function ( N ) {
	// Return N samples
	if ( typeof(N) == "undefined" || N == 1 ) {
		return isLower(rand(this.dimension) , this.mean);
	}
	else {
		return isLower(rand(N, this.dimension) , outerprod(ones(N), this.mean) );
	}
}


Bernoulli.prototype.estimate = function ( X ) {
	// Estimate dsitribution from the N-by-d matrix X
	switch ( type ( X ) ) {
	case "matrix":
	case "spmatrix":
		this.mean = mean(X,1).val;
		this.variance = entrywisemul(this.mean, sub(1, this.mean)) ;
		this.std = sqrt(this.variance);
		this.dimension = X.n;
		break;
	case "vector":
	case "spvector":
		this.dimension = 1;
		this.mean = mean(X) ;
		this.variance = this.mean * (1-this.mean);
		this.std = Math.sqrt(this.variance);
		break;
	default:
		error("Error in Bernoulli.estimate( X ): X must be a (sp)matrix or (sp)vector.");
		break;
	}
	return this;
}


///////////////////////////////
///  Poisson
///////////////////////////////
function Poisson ( params ) {
	var that = new Distribution ( Poisson, params ) ;
	return that;
}


Poisson.prototype.construct = function ( mean ) {
	// Read params and create the required fields for a specific algorithm
	if ( typeof(mean) == "undefined" )
		var mean = 5;

	var dim = size(mean,1);

	this.mean = mean;
	this.variance = this.mean;
	this.std = sqrt(this.variance);
	this.dimension = dim;
}

Poisson.prototype.pdf = Poisson.prototype.pmf = function ( x ) {
	// return value of PDF at x
	const tx = type(x);

	var pdfscalar = function ( s, lambda ) {
		if ( s < 0 || Math.round(s) != s )
			return 0;
		else if ( s == 0)
			return 1;
		else {
			var u = lambda;
			for ( var k = 2; k <= s; k++ )
				u *= lambda / k;
			return Math.exp(-lambda) * u;
		}
	};

	if ( this.dimension == 1 ) {
		if ( tx == "number" ) {
			return pdfscalar(x, this.mean);
		}
		else if ( tx == "vector") {
			var p = zeros(x.length);
			for(var i = 0; i < x.length ; i++){
				p[i] = pdfscalar(x[i], this.mean);
			}
			return p;
		}
		else if ( tx == "matrix") {
			var P = zeros(x.m, x.n);
			var mn = x.m*x.n;
			for(var k = 0; k < mn ; k++){
				P.val[k] = pdfscalar(x.val[k], this.mean);
			}
			return p;
		}
	}
	else {
		if ( tx == "vector" ) {
			var p = pdfscalar(x[0], this.mean[0]);
			for (var k =0; k < this.dimension; k++)
				p *= pdfscalar(x[k], this.mean[k]);

			return p;
		}
		else if ( tx == "matrix") {
			var p = zeros(x.m);
			for (var i=0; i < x.m; i++) {
				p[i] = pdfscalar(x.val[i*x.n], this.mean[0]);
				for (var k =0; k < x.n; k++)
					p[i] *= pdfscalar(x.val[i*x.n + k], this.mean[k]);
			}
			return p;
		}
	}

}

Poisson.prototype.sample = function ( N ) {
	// Return N samples
	var samplescalar = function (lambda) {
		var x = Math.random();
		var n = 0;
		const exp_lambda = Math.exp(-lambda);
		while (x > exp_lambda) {
			x *= Math.random();
			n++;
		}
		return n;
	};

	if ( typeof(N) == "undefined" || N == 1 ) {
		if ( this.dimension == 1 )
			return samplescalar(this.mean);
		else {
			var s = zeros(this.dimension);
			for ( k=0; k < this.dimension; k++)
				s[k] = samplescalar(this.mean[k]);
			return s;
		}
	}
	else {
		if ( this.dimension == 1 ) {
			var S = zeros(N);
			for ( var i=0; i < N; i++)
				S[i] =  samplescalar(this.mean);
			return S;
		}
		else {
			var S = zeros(N, this.dimension);
			for ( var i=0; i < N; i++) {
				for ( k=0; k < this.dimension; k++)
					S[i*this.dimension + k] = samplescalar(this.mean[k]);
			}
			return S;
		}
	}
}


Poisson.prototype.estimate = function ( X ) {
	// Estimate dsitribution from the N-by-d matrix X
	if ( type ( X ) == "matrix" ) {
		this.mean = mean(X,1).val;
		this.variance = this.mean;
		this.std = sqrt(this.variance);
		this.dimension = X.n;
	}
	else { // X is a vector samples
		this.dimension = 1;
		this.mean = mean(X) ;
		this.variance = this.mean;
		this.std = Math.sqrt(this.variance);
	}
	return this;
}

const Complex_I = new Complex(0, 1);

/**
 * @constructor
 * @struct
 */
function Complex(a, b, polar) {
	/** @const */ this.type = "Complex";

	if ( typeof(a) == "undefined") {
		this.re = 0.0;
		this.im = 0.0;
	}
	else if ( a instanceof Complex ) {
		this.re = a.re;
		this.im = a.im;
	}
	else if ( typeof(a) == "number" && !polar ) {
		this.re = a;
		this.im = b;
	}
	else {
		this.re = a * Math.cos(b);
		this.im = a * Math.sin(b);
	}
}

Complex.prototype.toString = function () {
	return this.re + (this.im >= 0 ? " + " : " - ") + Math.abs(this.im) + "i";
}
Complex.prototype.info = function () {
	return this.re + (this.im >= 0 ? " + " : " - ") + Math.abs(this.im) + "i";
}
/**
 * @param {Complex}
 * @param {Complex}
 * @return {Complex}
 */
function addComplex(a,b) {
	var z = new Complex(a);
	z.re += b.re;
	z.im += b.im;
	return z;
}
/**
 * @param {Complex}
 * @param {number}
 * @return {Complex}
 */
function addComplexReal(a,b) {
	var z = new Complex(a);
	z.re += b;
	return z;
}
/**
 * @param {Complex}
 * @param {Complex}
 * @return {Complex}
 */
function subComplex(a,b) {
	var z = new Complex(a);
	z.re -= b.re;
	z.im -= b.im;
	return z;
}
/**
 * @param {Complex}
 * @return {Complex}
 */
function minusComplex(a) {
	return new Complex(-a.re, -a.im);
}

function mulComplex(a,b) {
	return new Complex(a.re*b.re - a.im*b.im, a.im * b.re + a.re*b.im);
}
function mulComplexReal(a,b) {
	return new Complex(a.re*b, a.im * b);
}
function divComplex(a,b) {
	var denom = b.re*b.re + b.im*b.im;
	return new Complex( (a.re*b.re + a.im*b.im) / denom, (a.im * b.re - a.re*b.im) / denom );
}

function conj(z) {
	if (z instanceof Complex)
		return new Complex(z.re, -z.im);
	else if (z instanceof ComplexVector) {
		var r = new ComplexVector(z);
		for (var i=0; i < z.length; i++)
			r.im[i] = -r.im[i];
		return r;
	}
	else if (z instanceof ComplexMatrix) {
		var r = new ComplexMatrix(z);
		for (var i=0; i < z.length; i++)
			r.im[i] = -r.im[i];
		return r;
	}
	else
		return new Complex(z);	// for a real
}

function modulus(z) {
	if ( z instanceof Complex )
		return Math.sqrt(z.re*z.re + z.im*z.im);
	else if (z instanceof ComplexVector)
		return sqrt(addVectors( entrywisemulVector(z.re, z.re), entrywisemulVector(z.im, z.im) ));
	else if (z instanceof ComplexVector)
		return new Matrix(z.m, z.n, sqrt(addVectors( entrywisemulVector(z.re, z.re), entrywisemulVector(z.im, z.im) ) , true));
}
var absComplex = modulus;

function expComplex(z) {
	return new Complex(Math.exp(z.re), z.im, true);
}



/**
 * @constructor
 * @struct
 */
function ComplexVector(a, b, dontcopy) {
	/** @const */ this.type = "ComplexVector";

	if ( arguments.length == 0 ) {
		// dummy call, probably in renewObject
		// while loading data from a file
	}
	else if ( a instanceof ComplexVector) {
		/** @const */ this.length = a.length;
		this.re = vectorCopy(a.re);
		this.im = vectorCopy(a.im);
	}
	else if (typeof(a) == "number") {
		/** @const */ this.length = a;
		this.re = new Float64Array(a);
		this.im = new Float64Array(a);
	}
	else if ( a instanceof Float64Array && b instanceof Float64Array ) {
		/** @const */ this.length = a.length;
		if ( typeof(dontcopy) == "undefined" || !dontcopy ){
			this.re = vectorCopy(a);
			this.im = vectorCopy(b);
		}
		else {
			this.re = a;
			this.im = b;
		}
	}
	else {
		error("Bad arguments to new ComplexVector()");
	}
}

/**
 * @constructor
 * @struct
 */
function ComplexMatrix(a, b, values, valuesimag) {
	/** @const */ this.type = "ComplexMatrix";

	if ( arguments.length == 0 ) {
		// dummy call, probably in renewObject
		// while loading data from a file
	}
	else if ( a instanceof ComplexMatrix) {
		/** @const */ this.length = a.length;
		/** @const */ this.m = a.m;
		/** @const */ this.n = a.n;
		/** @const */ this.size = [a.m, a.n];
		this.re = vectorCopy(a.re);
		this.im = vectorCopy(a.im);
	}
	else if (typeof(a) == "number" && typeof(b) == "number") {
		/** @const */ this.length = a;
		/** @const */ this.m = a;
		/** @const */ this.n = b;
		/** @const */ this.size = [a, b];
		if ( typeof(values) == "undefined") {
			this.re = new Float64Array(a*b);
			this.im = new Float64Array(a*b);
		}
		else if ( values instanceof ComplexVector ) {
			this.re = vectorCopy(values.re);
			this.im = vectorCopy(values.im);
		}
		else if ( values instanceof Float64Array && typeof(valuesimag) != "undefined" &&  valuesimag instanceof Float64Array) {
			this.re = values;
			this.im = valuesimag;	// !! no copy!
		}
	}
	else if ( a instanceof Matrix && b instanceof Matrix) {
		/** @const */ this.length = a.length;
		/** @const */ this.m = a.m;
		/** @const */ this.n = a.n;
		/** @const */ this.size = [a.m, a.n];
		this.re = vectorCopy(a.val);
		this.im = vectorCopy(b.val);
	}
	else
		error("Bad arguments to new ComplexMatrix()");
}


ComplexVector.prototype.toString = function () {
	return "[" + this.type + " of size " + this.length + "]";
}
ComplexMatrix.prototype.toString = function () {
	return "[" + this.type + " of size " + this.m + " x " + this.n + "]";
}
ComplexVector.prototype.get = function (i) {
	return new Complex(this.re[i], this.im[i]);
}
ComplexMatrix.prototype.get = function (i,j) {
	return new Complex(this.re[i*this.n + j], this.im[i*this.n + j]);
}
ComplexVector.prototype.set = function (i, z) {
	if ( typeof(z) == "number" )  {
		this.re[i] = z;
		this.im[i] =	0;
	}
	else {
		this.re[i] = z.re;
		this.im[i] = z.im;
	}
}
ComplexMatrix.prototype.set = function (i, j, z) {
	if ( typeof(z) == "number" )  {
		this.re[i*this.n + j] = z;
		this.im[i*this.n + j] =	0;
	}
	else {
		this.re[i*this.n + j] = z.re;
		this.im[i*this.n + j] = z.im;
	}
}
ComplexVector.prototype.getSubVector = function (rowsrange) {
	const n = rowsrange.length;
	var res = new ComplexVector( n );
	for (var i = 0; i< n; i++) {
		res.re[i] = this.re[rowsrange[i]];
		res.im[i] = this.im[rowsrange[i]];
	}
	return res;
}
ComplexVector.prototype.setVectorScalar = function (rowsrange, B) {
	var i;
	for (i = 0; i< rowsrange.length; i++)
		A.set ( rowsrange[i], B);
}
ComplexVector.prototype.setVectorVector = function (rowsrange, B) {
	var i;
	for (i = 0; i< rowsrange.length; i++)
		A.set(rowsrange[i], B[i]);
}



function real(z) {
	if (z instanceof Complex)
		return z.re;
	else if (z instanceof ComplexVector)
		return vectorCopy(z.re);
	else if (z instanceof ComplexMatrix)
		return new Matrix(z.m, z.n, z.re);
	else
		return copy(z);
}
function imag(z) {
	if (z instanceof Complex)
		return z.im;
	else if (z instanceof ComplexVector)
		return vectorCopy(z.im);
	else if (z instanceof ComplexMatrix)
		return new Matrix(z.m, z.n, z.im);
	else
		return 0;
}

/**
 * @param {MatrixComplex}
 */
function transposeComplexMatrix ( A ) {
	// Hermitian transpose = conjugate transpose
	const m = A.m;
	const n = A.n;
	if ( m > 1 ) {
		var i;
		var j;
		var res = new ComplexMatrix( n,m);
		var Aj = 0;
		for ( j=0; j< m;j++) {
			var ri = 0;
			for ( i=0; i < n ; i++) {
				res.re[ri + j] = A.re[Aj + i];
				res.im[ri + j] = -A.im[Aj + i];
				ri += m;
			}
			Aj += n;
		}
		return res;
	}
	else {
		return new ComplexVector(A.re,minusVector(A.im));
	}
}
/**
 * @param {MatrixComplex}
 */
ComplexMatrix.prototype.transpose = function ( ) {
	// simple Transpose without conjugate
	const m = A.m;
	const n = A.n;
	if ( m > 1 ) {
		var i;
		var j;
		var res = new ComplexMatrix( n,m);
		var Aj = 0;
		for ( j=0; j< m;j++) {
			var ri = 0;
			for ( i=0; i < n ; i++) {
				res.re[ri + j] = A.re[Aj + i];
				res.im[ri + j] = A.im[Aj + i];
				ri += m;
			}
			Aj += n;
		}
		return res;
	}
	else {
		return new ComplexVector(A.re,A.im);
	}
}


/**
 * @param {ComplexVector}
 * @param {ComplexVector}
 * @return {ComplexVector}
 */
function addComplexVectors(a, b) {
	var z = new ComplexVector(a);
	const n = a.length;
	for ( var i=0; i< n; i++) {
		z.re[i] += b.re[i];
		z.im[i] += b.im[i];
	}
	return z;
}
/**
 * @param {ComplexVector}
 * @param {ComplexVector}
 * @return {ComplexVector}
 */
function subComplexVectors(a, b) {
	var z = new ComplexVector(a);
	const n = a.length;
	for ( var i=0; i< n; i++) {
		z.re[i] -= b.re[i];
		z.im[i] -= b.im[i];
	}
	return z;
}

/**
 * @param {ComplexMatrix}
 * @param {ComplexMatrix}
 * @return {ComplexMatrix}
 */
function addComplexMatrices(a, b) {
	var z = new ComplexMatrix(a);
	const mn = a.m * a.n;
	for ( var i=0; i< mn; i++) {
		z.re[i] += b.re[i];
		z.im[i] += b.im[i];
	}
	return z;
}

/**
 * @param {ComplexMatrix}
 * @param {ComplexMatrix}
 * @return {ComplexMatrix}
 */
function subComplexMatrices(a, b) {
	var z = new ComplexMatrix(a);
	const mn = a.m * a.n;
	for ( var i=0; i< mn; i++) {
		z.re[i] -= b.re[i];
		z.im[i] -= b.im[i];
	}
	return z;
}
/**
 * @param {ComplexVector}
 * @param {Float64Array}
 * @return {ComplexVector}
 */
function addComplexVectorVector(a, b) {
	var z = new ComplexVector(a);
	const n = a.length;
	for ( var i=0; i< n; i++) {
		z.re[i] += b[i];
	}
	return z;
}
/**
 * @param {ComplexVector}
 * @param {Float64Array}
 * @return {ComplexVector}
 */
function subComplexVectorVector(a, b) {
	var z = new ComplexVector(a);
	const n = a.length;
	for ( var i=0; i< n; i++) {
		z.re[i] -= b[i];
	}
	return z;
}
/**
 * @param {ComplexMatrix}
 * @param {Matrix}
 * @return {ComplexMatrix}
 */
function addComplexMatrixMatrix(a, b) {
	var z = new ComplexMatrix(a);
	const n = a.m * a.n;
	for ( var i=0; i< n; i++) {
		z.re[i] += b.val[i];
	}
	return z;
}
/**
 * @param {ComplexMatrix}
 * @param {Matrix}
 * @return {ComplexMatrix}
 */
function subComplexMatrixMatrix(a, b) {
	var z = new ComplexMatrix(a);
	const n = a.m * a.n;
	for ( var i=0; i< n; i++) {
		z.re[i] -= b.val[i];
	}
	return z;
}

/**
 * @param {number}
 * @param {ComplexVector}
 * @return {ComplexVector}
 */
function addScalarComplexVector(a, b) {
	var z = new ComplexVector(b);
	const n = b.length;
	for ( var i=0; i< n; i++) {
		z.re[i] += a;
	}
	return z;
}
/**
 * @param {number}
 * @param {ComplexVector}
 * @return {ComplexVector}
 */
function subScalarComplexVector(a, b) {
	var z = minusComplexVector(b);
	const n = b.length;
	for ( var i=0; i< n; i++) {
		z.re[i] += a;
	}
	return z;
}

/**
 * @param {number}
 * @param {ComplexMatrix}
 * @return {ComplexMatrix}
 */
function addScalarComplexMatrix(a, b) {
	var z = new ComplexMatrix(b);
	const n = b.m * b.n;
	for ( var i=0; i< n; i++) {
		z.re[i] += a;
	}
	return z;
}



/**
 * @param {ComplexVector}
 * @param {ComplexVector}
 * @return {ComplexVector}
 */
function entrywisemulComplexVectors(a, b) {
	const n = a.length;
	var z = new ComplexVector(n);
	for ( var i=0; i< n; i++) {
		z.re[i] = a.re[i] * b.re[i] - a.im[i] * b.im[i];
		z.im[i] = a.im[i] * b.re[i] + a.re[i] * b.im[i];
	}
	return z;
}
/**
 * @param {ComplexVector}
 * @param {ComplexVector}
 * @return {ComplexVector}
 */
function entrywisedivComplexVectors(a, b) {
	const n = a.length;
	var z = new ComplexVector(n);
	for ( var i=0; i< n; i++) {
		var bre = b.re[i];
		var bim = b.im[i];
		var denom = bre*bre + bim*bim;
		z.re[i] = (a.re[i]*bre + a.im[i]*bim) / denom;
		z.im[i] = (a.im[i]*bre - a.re[i]*bim) / denom;
	}
	return z;
}
/**
 * @param {ComplexMatrix}
 * @param {ComplexMatrix}
 * @return {ComplexMatrix}
 */
function entrywisemulComplexMatrices(a, b) {
	const n = a.m * a.n;
	var z = new ComplexMatrix(a.m, a.n);
	for ( var i=0; i< n; i++) {
		z.re[i] = a.re[i] * b.re[i] - a.im[i] * b.im[i];
		z.im[i] = a.im[i] * b.re[i] + a.re[i] * b.im[i];
	}
	return z;
}
/**
 * @param {ComplexMatrix}
 * @param {ComplexMatrix}
 * @return {ComplexMatrix}
 */
function entrywisedivComplexMatrices(a, b) {
	const n = a.m * a.n;
	var z = new ComplexMatrix(a.m, a.n);
	for ( var i=0; i< n; i++) {
		var bre = b.re[i];
		var bim = b.im[i];
		var denom = bre*bre + bim*bim;
		z.re[i] = (a.re[i]*bre + a.im[i]*bim) / denom;
		z.im[i] = (a.im[i]*bre - a.re[i]*bim) / denom;
	}
	return z;
}

/**
 * @param {ComplexVector}
 * @param {Float64Array}
 * @return {ComplexVector}
 */
function entrywisemulComplexVectorVector(a, b) {
	const n = a.length;
	var z = new ComplexVector(n);
	for ( var i=0; i< n; i++) {
		z.re[i] = a.re[i] * b[i];
		z.im[i] = a.im[i] * b[i];
	}
	return z;
}
/**
 * @param {ComplexMatrix}
 * @param {Matrix}
 * @return {ComplexMatrix}
 */
function entrywisemulComplexMatrixMatrix(a, b) {
	const n = a.m * a.n;
	var z = new ComplexMatrix(a.m, a.n);
	for ( var i=0; i< n; i++) {
		z.re[i] = a.re[i] * b.val[i];
		z.im[i] = a.im[i] * b.val[i];
	}
	return z;
}

/**
 * @param {ComplexVector}
 * @return {ComplexVector}
 */
function minusComplexVector(a) {
	const n = a.length;
	var z = new ComplexVector(n);
	for ( var i=0; i< n; i++) {
		z.re[i] = -a.re[i];
		z.im[i] = -a.im[i];
	}
	return z;
}
/**
 * @param {ComplexMatrix}
 * @return {ComplexMatrix}
 */
function minusComplexMatrix(a) {
	var z = new ComplexMatrix(a.m, a.n);
	const n = a.m * a.n;
	for ( var i=0; i< n; i++) {
		z.re[i] = -a.re[i];
		z.im[i] = -a.im[i];
	}
	return z;
}
/**
 * @param {ComplexVector}
 * @return {number}
 */
function sumComplexVector(a) {
	var z = new Complex();
	const n = a.length;
	for ( var i=0; i< n; i++) {
		z.re += a.re[i];
		z.im += a.im[i];
	}
	return z;
}
/**
 * @param {ComplexMatrix}
 * @return {number}
 */
function sumComplexMatrix(a) {
	var z = new Complex();
	const n = a.m * a.n;
	for ( var i=0; i< n; i++) {
		z.re += a.re[i];
		z.im += a.im[i];
	}
	return z;
}
/**
 * @param {ComplexVector}
 * @return {number}
 */
function norm1ComplexVector(a) {
	var r = 0.0;
	const n = a.length;
	for ( var i=0; i< n; i++) {
		r += Math.sqrt(a.re[i] * a.re[i] + a.im[i]*a.im[i]);
	}
	return r;
}
/**
 * @param {ComplexVector}
 * @return {number}
 */
function norm2ComplexVector(a) {
	var r = 0.0;
	const n = a.length;
	for ( var i=0; i< n; i++) {
		r += a.re[i] * a.re[i] + a.im[i]*a.im[i];
	}
	return Math.sqrt(r);
}
/**
 * @param {ComplexMatrix}
 * @return {number}
 */
function normFroComplexMatrix(a) {
	var r = 0.0;
	const n = a.m * a.n;
	for ( var i=0; i< n; i++) {
		r += a.re[i] * a.re[i] + a.im[i]*a.im[i];
	}
	return Math.sqrt(r);
}
/**
 * @param {ComplexVector}
 * @param {ComplexVector}
 * @return {Complex}
 */
function dotComplexVectors(a, b) {
	// = b^H a = conj(b)^T a
	var z = new Complex();
	const n = a.length;
	for ( var i=0; i< n; i++) {
		z.re += a.re[i] * b.re[i] + a.im[i] * b.im[i];
		z.im += a.im[i] * b.re[i] - a.re[i] * b.im[i]
	}
	return z;
}
/**
 * @param {ComplexVector}
 * @param {Float64Array}
 * @return {Complex}
 */
function dotComplexVectorVector(a, b) {
	// = b^T a
	var z = new Complex();
	const n = a.length;
	for ( var i=0; i< n; i++) {
		z.re += a.re[i] * b[i];
		z.im += a.im[i] * b[i];
	}
	return z;
}
/**
 * @param {number}
 * @param {ComplexVector}
 * @return {ComplexVector}
 */
function mulScalarComplexVector(a, b) {
	var re = mulScalarVector(a, b.re);
	var im = mulScalarVector(a, b.im);
	return new ComplexVector(re,im, true);
}
/**
 * @param {Complex}
 * @param {ComplexVector}
 * @return {ComplexVector}
 */
function mulComplexComplexVector(a, b) {
	const n = b.length;
	var z = new ComplexVector(n);
	var are = a.re;
	var aim = a.im;
	for ( var i=0; i< n; i++) {
		z.re[i] = are * b.re[i] - aim * b.im[i];
		z.im[i] = aim * b.re[i] + are * b.im[i];
	}
	return z;
}
/**
 * @param {Complex}
 * @param {Float64Array}
 * @return {ComplexVector}
 */
function mulComplexVector(a, b) {
	const n = b.length;
	var z = new ComplexVector(n);
	var are = a.re;
	var aim = a.im;
	for ( var i=0; i< n; i++) {
		z.re[i] = are * b[i];
		z.im[i] = aim * b[i];
	}
	return z;
}
/**
 * @param {number}
 * @param {ComplexMatrix}
 * @return {ComplexMatrix}
 */
function mulScalarComplexMatrix(a, b) {
	var re = mulScalarVector(a, b.re);
	var im = mulScalarVector(a, b.im);
	return new ComplexMatrix(b.m, b.n, re, im);
}
/**
 * @param {Complex}
 * @param {ComplexMatrix}
 * @return {ComplexMatrix}
 */
function mulComplexComplexMatrix(a, b) {
	const n = b.m*b.n;
	var z = new ComplexMatrix(b.m,b.n);
	var are = a.re;
	var aim = a.im;
	for ( var i=0; i< n; i++) {
		z.re[i] = are * b.re[i] - aim * b.im[i];
		z.im[i] = aim * b.re[i] + are * b.im[i];
	}
	return z;
}
/**
 * @param {Complex}
 * @param {Matrix}
 * @return {ComplexMatrix}
 */
function mulComplexMatrix(a, b) {
	const n = b.m * b.n;
	var z = new ComplexMatrix(b.m, b.n);
	var are = a.re;
	var aim = a.im;
	for ( var i=0; i< n; i++) {
		z.re[i] = are * b.val[i];
		z.im[i] = aim * b.val[i];
	}
	return z;
}
/**
 * @param {ComplexMatrix}
 * @param {Float64Array}
 * @return {ComplexVector}
 */
function mulComplexMatrixVector(a, b) {
	const m = a.m;
	const n = a.n;
	var z = new ComplexVector(m);
	var ai = 0;
	for ( var i=0; i< m; i++) {
		for ( j=0; j < n ; j++) {
			z.re[i] += a.re[ai+j] * b[j];
			z.im[i] += a.im[ai+j] * b[j];
		}
		ai += n;
	}
	return z;
}
/**
 * @param {ComplexMatrix}
 * @param {ComplexVector}
 * @return {ComplexVector}
 */
function mulComplexMatrixComplexVector(a, b) {
	const m = a.m;
	const n = a.n;
	var z = new ComplexVector(m);
	var ai = 0;
	for ( var i=0; i< m; i++) {
		for ( j=0; j < n ; j++) {
			z.re[i] += a.re[ai+j] * b.re[j] - a.im[ai+j] * b.im[j];
			z.im[i] += a.im[ai+j] * b.re[j] + a.re[ai+j] * b.im[j];
		}
		ai += n;
	}
	return z;
}

/**
 * @param {ComplexMatrix}
 * @param {ComplexMatrix}
 * @return {ComplexMatrix}
 */
function mulComplexMatrices(A, B) {
	const m = A.length;
	const n = B.n;
	const n2 = B.length;

	var Are = A.re;
	var Aim = A.im;
	var Bre = B.re;
	var Bim = B.im;

	var Cre = new Float64Array(m*n);
	var Cim = new Float64Array(m*n);
	var aik;
	var Aik = 0;
	var Ci = 0;
	for (var i=0;i < m ; i++) {
		var bj = 0;
		for (var k=0; k < n2; k++ ) {
			aikre = Are[Aik];
			aikim = Aim[Aik];
			for (var j =0; j < n; j++) {
				Cre[Ci + j] += aikre * Bre[bj] - aikim * Bim[bj];
				Cim[Ci + j] += aikre * Bim[bj] + aikim * Bre[bj];
				bj++;
			}
			Aik++;
		}
		Ci += n;
	}
	return  new ComplexMatrix(m,n,Cre, Cim);
}
/**
 * @param {ComplexMatrix}
 * @param {Matrix}
 * @return {ComplexMatrix}
 */
function mulComplexMatrixMatrix(A, B) {
	const m = A.m;
	const n = B.n;
	const n2 = B.m;

	var Are = A.re;
	var Aim = A.im;
	var Bre = B.val;

	var Cre = new Float64Array(m*n);
	var Cim = new Float64Array(m*n);
	var aik;
	var Aik = 0;
	var Ci = 0;
	for (var i=0;i < m ; i++) {
		var bj = 0;
		for (var k=0; k < n2; k++ ) {
			aikre = Are[Aik];
			aikim = Aim[Aik];
			for (var j =0; j < n; j++) {
				Cre[Ci + j] += aikre * Bre[bj];
				Cim[Ci + j] += aikim * Bre[bj];
				bj++;
			}
			Aik++;
		}
		Ci += n;
	}
	return  new ComplexMatrix(m,n,Cre, Cim);
}



/**
 * @param {Float64Array|ComplexVector}
 * @return {ComplexVector}
 */
function fft(x) {
	const n = x.length;
	const s = Math.log2(n);
	const m = n/2;

	if ( s % 1 != 0 ) {
		error("fft(x) only implemented for x.length = 2^m. Use dft(x) instead.");
		return undefined;
	}

	var X = new ComplexVector(x,zeros(n));

	// bit reversal:
	var j = 0;
	for (var i = 0; i < n-1 ; i++) {
		if (i < j) {
			// swap(X[i], X[j])
			var Xi = X.re[i];
			X.re[i] = X.re[j];
			X.re[j] = Xi;
			Xi = X.im[i];
			X.im[i] = X.im[j];
			X.im[j] = Xi;
		}

		var k = m;
		while (k <= j) {
			j -= k;
			k /= 2;
		}
		j += k;
	}

	// FFT:
	var l2 = 1;
	var c = new Complex(-1,0);
	var u = new Complex();
	for (var l = 0; l < s; l++) {
		var l1 = l2;
		l2 *= 2;
		u.re = 1;
		u.im = 0;
      	for (var j = 0; j < l1; j++) {
        	for (var i = j; i < n; i += l2) {
		        var i1 = i + l1;
		        //var t1 = mulComplex(u, X.get(i1) );
		        var t1re = u.re * X.re[i1] - u.im * X.im[i1]; // t1 = u * X[i1]
		        var t1im = u.im * X.re[i1] + u.re * X.im[i1];

		        X.re[i1] = X.re[i] - t1re;
		        X.im[i1] = X.im[i] - t1im;

		        X.re[i] += t1re;
		        X.im[i] += t1im;
	        }

			u = mulComplex(u, c);
		}

		c.im = -Math.sqrt((1.0 - c.re) / 2.0);
		c.re = Math.sqrt((1.0 + c.re) / 2.0);
	}
	return X;
}
/**
 * @param {ComplexVector}
 * @return {ComplexVector|Float64Array}
 */
function ifft(x) {
	const n = x.length;
	const s = Math.log2(n);
	const m = n/2;

	if ( s % 1 != 0 ) {
		error("ifft(x) only implemented for x.length = 2^m. Use idft(x) instead.");
		return undefined;
	}


	var X = new ComplexVector(x,zeros(n));

	// bit reversal:
	var j = 0;
	for (var i = 0; i < n-1 ; i++) {
		if (i < j) {
			// swap(X[i], X[j])
			var Xi = X.re[i];
			X.re[i] = X.re[j];
			X.re[j] = Xi;
			Xi = X.im[i];
			X.im[i] = X.im[j];
			X.im[j] = Xi;
		}

		var k = m;
		while (k <= j) {
			j -= k;
			k /= 2;
		}
		j += k;
	}

	// iFFT:
	var l2 = 1;
	var c = new Complex(-1,0);
	var u = new Complex();
	for (var l = 0; l < s; l++) {
		var l1 = l2;
		l2 *= 2;
		u.re = 1;
		u.im = 0;
      	for (var j = 0; j < l1; j++) {
        	for (var i = j; i < n; i += l2) {
		        var i1 = i + l1;
		        //var t1 = mulComplex(u, X.get(i1) );
		        var t1re = u.re * X.re[i1] - u.im * X.im[i1]; // t1 = u * X[i1]
		        var t1im = u.im * X.re[i1] + u.re * X.im[i1];

		        X.re[i1] = X.re[i] - t1re;
		        X.im[i1] = X.im[i] - t1im;

		        X.re[i] += t1re;
		        X.im[i] += t1im;
	        }

			u = mulComplex(u, c);
		}

		c.im = Math.sqrt((1.0 - c.re) / 2.0);
		c.re = Math.sqrt((1.0 + c.re) / 2.0);
	}
	var isComplex = false;
	for(var i=0; i < n; i++) {
		X.re[i] /= n;
		X.im[i] /= n;
		if ( Math.abs(X.im[i]) > 1e-6 )
			isComplex = true;
	}
	if (isComplex)
		return X;
	else
		return X.re;
}

function dft(x) {
	// DFT of a real signal
	if ( typeof(x) == "number")
		return new Complex(x, 0);

	const n = x.length;
	if ( n == 1)
		return new Complex(x[0], 0);
	else if ( Math.log2(n) % 1 == 0 )
		return fft(x);
	else {
		var X = new ComplexVector(n);
		var thet = 0.0;
		for ( var i=0; i < n; i++) {
			var theta = 0.0;
			for ( var t=0; t < n; t++)  {
				// theta = -2 pi i * t / n;
				X.re[i] += x[t] * Math.cos(theta);
				X.im[i] += x[t] * Math.sin(theta);
				theta += thet;
			}
			thet -= 2*Math.PI / n;
		}
		return X;
	}
}
function idft(X) {
	// Only recovers real part
	/*
importScripts("src/experimental/complex.js")
t = 0:512
x = sin(t)
X = dft(x)
plot(modulus(X))
s = idft(X)
plot(s)
	*/
	if ( !(X instanceof ComplexVector) ) {
		if ( X instanceof Complex)
			return X.re;
		else if (typeof(X) == "number")
			return X;
		else if ( X instanceof Float64Array)
			return idft(new ComplexVector(X, zeros(X.length), true));
		else
			return undefined;
	}
	const n = X.length;
	if ( n == 1)
		return X.re[0];
	else if ( Math.log2(n) % 1 == 0 )
		return ifft(X);
	else {
		var x = new Float64Array(n);
		var thet = 0.0;
		for ( var t=0; t < n; t++) {
			var theta = 0.0;
			var re = 0.0;
			//var im = 0.0;
			for ( var i=0; i < n; i++)  {
				// theta = 2 pi i * t / n;
				re += X.re[i] * Math.cos(theta) - X.im[i] * Math.sin(theta);
				// im += X[i].im * Math.sin(theta) + X[i].re * Math.cos(theta); // not used for real signals
				theta += thet;
			}
			x[t] = re / n;
			thet += 2*Math.PI / n;
		}
		return x;
	}
}

function spectrum(x) {
	if ( x instanceof Float64Array ) {
		return absComplex(dft(x));
	}
	else
		return undefined;
}
/*
	Kernel functions :
		rbf
		poly
		polyh
		linear

		For custom kernels: typeof(kerneltype) = function (x1,x2,par)

		TODO: kernel() for spVectors
*/

/**
 * Evaluate a kernel function from its name/type
 * @param {(number|Float64Array|spVector)}
 * @param {(number|Float64Array|spVector)}
 * @param {(string|function)}
 * @param {?number}
 * @return {number}
 */
function kernel(x1, x2, kerneltype, par) {
	if ( typeof(kerneltype) === 'undefined')
		var kerneltype = "rbf";
	if (kerneltype != "linear" && typeof(par) === 'undefined') {
		var par = kernel_default_parameter(kerneltype, size(x1,1));
	}

	if (typeof(kerneltype) == "function" ) {
		// Custom kernel function
		return kerneltype(x1,x2,par);
	}

	var ker;
	switch (kerneltype){
		case "gaussian":
		case "Gaussian":
		case "RBF":
		case "rbf":
			if ( typeof(x1) == "number")
				ker = rbfkernelScalar(x1, x2, 1/(2 * par * par) );
			else
			 	ker = rbfkernel(x1, x2, 1/(2 * par * par) );
			break;
		case "poly":
			if ( typeof(x1)=="number")
				ker = polykernelScalar(x1,x2,par);
			else
				ker = polykernel(x1,x2,par);
			break;
		case "polyh":
			if ( typeof(x1)=="number")
				ker = polyhkernelScalar(x1,x2,par);
			else
				ker = polyhkernel(x1,x2,par);
			break;

		case "linear":
			if ( typeof(x1)=="number")
				ker = x1*x2;
			else
				ker = dot(x1,x2);
			break;

		default:
			ker = NaN;
			break;
	}

	return ker;
}
/**
 * Return a kernel function K to use as K(x1,x2)
 * @param {(string|function)}
 * @param {?(number|Float64Array)}
 * @param {string}
 * @return {function}
 */
function kernelFunction(kerneltype, par, inputType) {
	if ( typeof(kerneltype) === 'undefined')
		var kerneltype = "rbf";
	if (kerneltype != "linear" && typeof(par) === 'undefined') {
		var par = kernel_default_parameter(kerneltype);
	}
	if ( typeof(inputType) != 'string')
		var inputType = "vector";

	if (typeof(kerneltype) == "function" ) {
		// Custom kernel function
		return function ( x1, x2) {return kerneltype(x1,x2,par);};
	}

	var ker;
	switch (kerneltype){
		case "gaussian":
		case "Gaussian":
		case "RBF":
		case "rbf":
			const gamma =  1/(2 * par * par);
			switch(inputType) {
			case "number":
			case "scalar":
				ker = function ( x1, x2) {return rbfkernelScalar(x1, x2, gamma );};
				break;
			case "vector":
			 	ker = function ( x1, x2) {return rbfkernel(x1, x2, gamma );};
			 	break;
			case "spvector":
				ker = function ( x1, x2) {return rbfkernelsparse(x1, x2, gamma );};
				break;
			default:
				error("Unknown input type in kernelFunction ()");
			 	break;
			}
			break;
		case "poly":
			switch(inputType) {
			case "number":
			case "scalar":
				ker = function ( x1, x2) {return polykernelScalar(x1,x2,par);};
				break;
			case "vector":
				ker = function ( x1, x2) {return polykernel(x1,x2,par);};
				break;
			default:
				error("Unknown input type in kernelFunction ()");
			 	break;
			}
			break;
		case "polyh":
			switch(inputType) {
			case "number":
			case "scalar":
				ker = function ( x1, x2) {return polyhkernelScalar(x1,x2,par);};
				break;
			case "vector":
				ker = function ( x1, x2) {return polyhkernel(x1,x2,par);};
				break;
			default:
				error("Unknown input type in kernelFunction ()");
			 	break;
			}
			break;
		case "linear":
			switch(inputType) {
			case "number":
			case "scalar":
				ker = function ( x1, x2) {return x1*x2;};
				break;
			case "vector":
				ker = function ( x1, x2) {return dot(x1,x2);};
				break;
			case "spvector":
				ker = function ( x1, x2) {return spdot(x1,x2);};
				break;
			default:
				error("Unknown input type in kernelFunction ()");
			 	break;
			}
			break;

		default:
			ker = function ( x1, x2) {return NaN;}
			break;
	}

	return ker;
}
/**
 * Scalar Gaussian RBF Kernel function K(x1,x2) = exp(-gamma (x1-x2)^2)
 * @param {number}
 * @param {number}
 * @return {number}
 */
function rbfkernelScalar(x1, x2, gamma) {
	var diff = x1-x2;
	return Math.exp(-diff*diff * gamma);
}
/*function rbfkernel(x1, x2, gamma) {
	var diff = subVectors(x1,x2);
	return Math.exp(-dot(diff,diff) * gamma);
}*/
/**
 * Gaussian RBF Kernel function K(x1,x2) = exp(-gamma ||x1-x2||^2)
 * @param {Float64Array}
 * @param {Float64Array}
 * @return {number}
 */
function rbfkernel( x1, x2, gamma) {
	// Fast evaluation with
	// ||x1-x2||^2 > thresh => exp(-||x1-x2||^2/2sigma^2) < EPS ~= 0
	const n = x1.length;
	const thresh = 50 / gamma;
	var diff = x1[0] - x2[0];
	var sqdist = diff*diff;
	var j = 1;
	while ( j < n && sqdist < thresh ) {
		diff = x1[j] - x2[j];
		sqdist += diff*diff;
		j++;
	}
	if ( j < n )
		return 0;
	else
		return Math.exp(-sqdist * gamma);
}
/**
 * Gaussian RBF Kernel function K(x1,x2) = exp(-gamma ||x1-x2||^2)
 * for sparse vectors
 * @param {spVector}
 * @param {spVector}
 * @return {number}
 */
function rbfkernelsparse( x1, x2, gamma) {
	// Fast evaluation with
	// ||x1-x2||^2 > thresh => exp(-||x1-x2||^2/2sigma^2) < EPS ~= 0

	const thresh = 50 / gamma;
	const nnza = x1.val.length;
	const nnzb = x2.val.length;

	var k1 = 0;
	var k2 = 0;
	var i1;
	var i2;
	var diff;
	var sqdist = 0;

	while ( k1 < nnza && k2 < nnzb && sqdist < thresh ) {

		i1 = x1.ind[k1];
		i2 = x2.ind[k2];
		if ( i1 == i2 ) {
			diff = x1.val[k1] - x2.val[k2];
			k1++;
			k2++;
		}
		else if ( i1 < i2 ) {
			diff = x1.val[k1];
			k1++;
		}
		else {
			diff = x2.val[k2];
			k2++;
		}
		sqdist += diff*diff;
	}

	while( k1 < nnza && sqdist < thresh ) {
		diff = x1.val[k1];
		sqdist += diff*diff;
		k1++;
	}
	while ( k2 < nnzb && sqdist < thresh ) {
		diff = x2.val[k2];
		sqdist += diff*diff;
		k2++;
	}

	if ( sqdist >= thresh )
		return 0;
	else
		return Math.exp(-sqdist * gamma);
}

/**
 * Scalar polynomial Kernel function K(x1,x2) = (x1*x2 + 1)^deg
 * @param {number}
 * @param {number}
 * @return {number}
 */
function polykernelScalar(x1, x2, deg) {
	var x1x2 = x1*x2 + 1;
	var ker = x1x2;
	for ( var i=1; i < deg; i++)
		ker *= x1x2;
	return ker;
}
/**
 * polynomial Kernel function K(x1,x2) = (x1'x2 + 1)^deg
 * @param {Float64Array}
 * @param {Float64Array}
 * @return {number}
 */
function polykernel(x1, x2, deg) {
	var x1x2 = dot(x1,x2) + 1;
	var ker = x1x2;
	for ( var i=1; i < deg; i++)
		ker *= x1x2;
	return ker;
}
/**
 * polynomial Kernel function K(x1,x2) = (x1'x2 + 1)^deg
 * @param {spVector}
 * @param {spVector}
 * @return {number}
 */
function polykernelsparse(x1, x2, deg) {
	var x1x2 = spdot(x1,x2) + 1;
	var ker = x1x2;
	for ( var i=1; i < deg; i++)
		ker *= x1x2;
	return ker;
}
/**
 * Scalar homogeneous polynomial Kernel function K(x1,x2) = (x1*x2)^deg
 * @param {number}
 * @param {number}
 * @return {number}
 */
function polyhkernelScalar(x1, x2, deg) {
	var x1x2 = x1*x2;
	var ker = x1x2;
	for ( var i=1; i < deg; i++)
		ker *= x1x2;
	return ker;
}
/**
 * Homogeneous polynomial Kernel function K(x1,x2) = (x1'x2)^deg
 * @param {Float64Array}
 * @param {Float64Array}
 * @return {number}
 */
function polyhkernel(x1, x2, deg) {
	var x1x2 = dot(x1,x2);
	var ker = x1x2;
	for ( var i=1; i < deg; i++)
		ker *= x1x2;
	return ker;
}
/**
 * Homogeneous polynomial Kernel function K(x1,x2) = (x1'x2)^deg
 * @param {spVector}
 * @param {spVector}
 * @return {number}
 */
function polyhkernel(x1, x2, deg) {
	var x1x2 = spdot(x1,x2);
	var ker = x1x2;
	for ( var i=1; i < deg; i++)
		ker *= x1x2;
	return ker;
}

function custom_kernel_example(x1,x2, par) {
	// A custom kernel should define a default parameter (if any)
	if ( typeof(par) == "undefined")
		var par = 1;

	// Return K(x1,x2):
	return mul(x1,x2) + par;
}
function kernel_default_parameter(kerneltype, dimension ) {
	var par;
	switch (kerneltype){
		case "gaussian":
		case "Gaussian":
		case "RBF":
		case "rbf":
			par = 1;
			break;

		case "poly":
			par = 3;
			break;
		case "polyh":
			par = 3;
			break;

		case "linear":
			break;

		default:
			break;
	}

	return par;
}

function kernelMatrix( X , kerneltype, kernelpar, X2) {
	var i;
	var j;

	if ( typeof(kerneltype) === 'undefined')
		var kerneltype = "rbf";
	if ( typeof(kernelpar) === 'undefined')
		var kernelpar = kernel_default_parameter(kerneltype, size(X,2));

	const tX = type(X);
	var inputtype;
	if (tX == "vector" )
		inputtype = "number";
	else if ( tX == "matrix")
		inputtype = "vector";
	else if ( tX == "spmatrix")
		inputtype = "spvector";
	else
		error("Unknown input type in kernelMatrix().");

	var kerFunc = kernelFunction(kerneltype, kernelpar, inputtype);

	if ( arguments.length < 4 ) {
		// compute K(X,X) (the Gram matrix of X)
		if ( kerneltype == "linear") {
			return mul( X,transpose(X)); // this should be faster
		}

		switch(inputtype) {
			case "number":
				K = kernelMatrixScalars(X, kerFunc) ;
				break;
			case "vector":
				K = kernelMatrixVectors(X, kerFunc) ;
				break;
			case "spvector":
				K = kernelMatrixspVectors(X, kerFunc) ;
				break;
			default:
				K = undefined;
				break;
		}
	}
	else {
		// compute K(X, X2)
		var m = X.length;
		var t2 = type(X2);
		if (t2 == "number" ) {
			// X2 is a single data number:
			if ( kerneltype == "linear") {
				return mul( X,X2); // this should be faster
			}

			var K = zeros(m);
			for (i = 0; i<m; i++) {
				K[i] = kerFunc(X[i], X2);
			}
		}
		else if ( t2 == "vector" && tX == "matrix" && X.n >1 )  {
			// X2 is a single data vector :
			if ( kerneltype == "linear") {
				return mul( X,X2); // this should be faster
			}

			var K = zeros(m);
			for (i = 0; i<m; i++) {
				K[i] = kerFunc(X.row(i), X2);
			}
		}
		else if ( t2 == "vector" && tX == "vector" )  {
			// X2 is a vector of multiple data instances in dim 1
			if ( kerneltype == "linear") {
				return outerprodVectors( X,X2); // this should be faster
			}
			var n = X2.length;
			var K = zeros(m,n);
			var ki = 0;
			for (i = 0; i<m; i++) {
				for (j = 0; j < n; j++) {
					K.val[ki + j] = kerFunc(X[i], X2[j]);
				}
				ki += n	;
			}
		}
		else {
			// X2 is a matrix
			if ( kerneltype == "linear") {
				return mul( X,transpose(X2)); // this should be faster
			}

			var n = X2.length;
			var K = zeros(m,n);
			var X2j = new Array(n);
			for (j = 0; j < n; j++) {
				X2j[j] = X2.row(j);
			}
			var ki = 0;
			for (i = 0; i<m; i++) {
				var Xi = X.row(i);
				for (j = 0; j < n; j++) {
					K.val[ki + j] = kerFunc(Xi, X2j[j]);
				}
				ki += n	;
			}
		}

	}
	return K;
}
/*function kernelMatrixVectors2(X, kerFunc, kerPar) {
	const n = X.length;
	var K = zeros(n,n);
	var ri = 0;
	var rj;
	var Xi;
	var ki = 0;
	var Kij;
	for (var i = 0; i<n; i++) {
		rj = 0;
		Xi = X.val.subarray(ri, ri + X.n);
		for (var j = 0; j < i; j++) {
			Kij = kerFunc( Xi, X.val.subarray(rj, rj + X.n), kerPar);
			K.val[ki + j] = Kij;
			K.val[j * n + i] = Kij;
			rj += X.n;
		}
		K.val[i*n + i] = kerFunc(Xi, Xi, kerPar) ;
		ri += X.n;
		ki += n;
	}
	return K;
}*/
function kernelMatrixVectors(X, kerFunc) {
	const n = X.length;
	var K = zeros(n,n);
	var ri = 0;
	var Xi  = new Array(n);
	var ki = 0;
	var Kij;
	for (var i = 0; i<n; i++) {
		rj = 0;
		Xi[i] = X.val.subarray(ri, ri + X.n);
		for (var j = 0; j < i; j++) {
			Kij = kerFunc( Xi[i], Xi[j] );
			K.val[ki + j] = Kij;
			K.val[j * n + i] = Kij;
		}
		K.val[i*n + i] = kerFunc(Xi[i], Xi[i]) ;
		ri += X.n;
		ki += n;
	}
	return K;
}
function kernelMatrixspVectors(X, kerFunc) {
	const n = X.length;
	var K = zeros(n,n);
	var Xi  = new Array(n);
	var ki = 0;
	var Kij;
	for (var i = 0; i<n; i++) {
		rj = 0;
		Xi[i] = X.row(i);
		for (var j = 0; j < i; j++) {
			Kij = kerFunc( Xi[i], Xi[j] );
			K.val[ki + j] = Kij;
			K.val[j * n + i] = Kij;
		}
		K.val[i*n + i] = kerFunc(Xi[i], Xi[i]) ;
		ki += n;
	}
	return K;
}
function kernelMatrixScalars(X, kerFunc, kerPar) {
	const n = X.length;
	var K = zeros(n,n);
	var ki = 0;
	var Kij;
	for (var i = 0; i<n; i++) {
		for (var j = 0; j < i; j++) {
			Kij = kerFunc(X[i], X[j], kerPar);
			K.val[ki + j] = Kij;
			K.val[j * n + i] = Kij;
		}
		K.val[ki + i] = kerFunc(X[i], X[i], kerPar) ;
		ki += n;
	}
	return K;
}
function kernelMatrixUpdate( K , kerneltype, kernelpar, previouskernelpar) {
	/*
		Kernel matrix update for RBF and poly kernels
		K = pow(K, ... )
		This is an in place update that destroys previous K

		NOTE: with the poly kernel, all entries in K must be positive or kernelpar/previouskernelpar must be an integer.
	*/
	if ( arguments.length < 4 )
		return undefined;

	const n = K.length;

	switch ( kerneltype ) {
		case "gaussian":
		case "Gaussian":
		case "RBF":
		case "rbf":
			var power = previouskernelpar/kernelpar;
			power *= power;
			break;
		case "poly":
		case "polyh":
			var power = kernelpar/previouskernelpar;
			break;
		case "linear":
			return K;
			break;
		default:
			return "undefined";
	}
	var i;
	var j;
	var ki = 0;
	if ( Math.abs(power - 2) < 1e-10 ) {
		// fast updates for K = K^2
		for (i = 0; i<n; i++) {
			for (j = 0; j < i; j++) {
				K.val[ki + j] *= K.val[ki + j];
				K.val[j*n + i] = K.val[ki + j];//symmetric part
			}
			K.val[ki + i] *= K.val[ki + i];
			ki += n;
		}
	}
	else {
		// otherwise do K = pow(L, power)
		for (i = 0; i<n; i++) {
			for (j = 0; j < i; j++) {
				K.val[ki + j] = Math.pow( K.val[ki + j], power );
				K.val[j*n + i] = K.val[ki + j];
			}
			K.val[ki + i] = Math.pow( K.val[ki + i], power );

			ki += n;
		}
	}

	return K;
}
//////////::
// Kernel Cache
//////////////////
/**
 * @constructor
 */
function kernelCache ( X , kerneltype, kernelpar, cacheSize) {
	// Create a kernel cache of a given size (number of entries)

	if ( typeof(kerneltype) === 'undefined')
		var kerneltype = "rbf";
	if ( typeof(kernelpar) === 'undefined')
		var kernelpar = kernel_default_parameter(kerneltype, size(X,2));
	if  ( typeof(cacheSize) == "undefined" )
		var cacheSize = Math.floor(64 * 1024 * 1024) ; // 64*1024*1024 entries = 512 MBytes
													   // = enough for the entire K with up to 8000 data
	if ( cacheSize < X.length * 10 )
		cacheSize = X.length * 10; // cache should be large enough for 10 rows of K

	const tX = type(X);
	var inputtype = "vector";
	if ( tX == "matrix")
		this.X = matrixCopy(X);
	else if (tX == "spmatrix" ) {
		if ( X.rowmajor )
			this.X = X.copy();
		else
			this.X = X.toRowmajor();
		inputtype = "spvector";
	}
	else
		this.X = new Matrix(X.length, 1, X); // X is a vector of numbers => single column matrix


	this.Xi = new Array(this.X.length);
	for ( var i = 0; i< this.X.length; i++)
		this.Xi[i] = this.X.row(i);


	this.kerneltype = kerneltype;
	this.kernelpar = kernelpar;
	this.kernelFunc = kernelFunction(kerneltype, kernelpar, inputtype); // X transformed to matrix in any case (Xi = (sp)vector)
	this.inputtype = inputtype;

	this.previouskernelpar = undefined;	// for kernel updates
	this.rowsToUpdate = 0;
	this.needUpdate = undefined;

	this.cachesize = cacheSize; // in number of Kij entries
	this.size = Math.min( Math.floor(cacheSize / X.length), X.length ); // in number of rows;
	this.rowlength = X.length;

	this.K = zeros(this.size, X.length );
	this.rowindex = new Array(); // list of rows indexes: rowindex[i] = index of X_j whose row is store in K[i]
	this.LRU = new Array(); 	// list of last recently used rows (index in K)
								// the last recently used is at the beginning of the list
}

/**
 * @param {number}
 * @return {Float64Array}
 */
kernelCache.prototype.get_row = function ( row ) {
	var j;
	var Krow;
	var i = this.rowindex.indexOf( row );

	if ( i >= 0 ) {
		// requested row already in cache
		this.updateRow(i); // update row if needed due to kernelpar change
		Krow = this.K.row(i); // for thread safe :  vectorCopy(K[i]);
	}
	else {
		// Need to compute the new row

		// Find an index to store the row
		if (this.rowindex.length < this.size) {
			// There is space for this row, so append at the end
			i = this.rowindex.length;
			this.rowindex.push( row ) ;
		}
		else {
			// Need to erase the last recenty used:
			i = this.LRU[0];
			this.rowindex[i] = row;
		}

		// Compute kernel row
		Krow = this.K.row(i);
		//var Xrow = this.X.row(row);
		for (j = 0; j < this.rowlength; j++) {
			//Krow[j] = this.kernelFunc(Xrow, this.X.row(j));
			Krow[j] = this.kernelFunc(this.Xi[row], this.Xi[j]);
		}
	}

	// Update LRU
	var alreadyInLRU = this.LRU.indexOf(i);
	if ( alreadyInLRU >= 0)
		this.LRU.splice(alreadyInLRU, 1);
	this.LRU.push(i);

	return Krow;
}


kernelCache.prototype.update = function( kernelpar ) {
	// update the kernel parameter to kernelpar
	// careful: each row may have been computed with a different kernelpar (if not used during last training...)

	if( typeof(this.needUpdate) == "undefined" )
		this.needUpdate = new Array(this.rowindex.length);

	if( typeof(this.previouskernelpar) == "undefined" )
		this.previouskernelpar = new Array(this.rowindex.length);

	for (var i = 0; i < this.rowindex.length; i++) {
		if ( typeof(this.needUpdate[i]) == "undefined" || this.needUpdate[i] == false ) { // otherwise keep previous values
			this.needUpdate[i] = true;
			this.previouskernelpar[i] = this.kernelpar;
			this.rowsToUpdate++;
		}
	}

	this.kernelpar = kernelpar;
	this.kernelFunc = kernelFunction(this.kerneltype, kernelpar, this.inputtype); // X transformed to matrix in any case (Xi = (sp)vector)

}
kernelCache.prototype.updateRow = function( i ) {
	// update the kernel row in the ith row of the cache

	if ( this.rowsToUpdate > 0 && typeof(this.needUpdate[i]) != "undefined" && this.needUpdate[i]) {
		switch ( this.kerneltype ) {
			case "gaussian":
			case "Gaussian":
			case "RBF":
			case "rbf":
				var power = this.previouskernelpar[i] / this.kernelpar;
				power *= power;
				break;
			case "poly":
			case "polyh":
				var power = this.kernelpar / this.previouskernelpar[i];
				break;
			default:
				return ;
		}
		var pr = Math.round(power);
		if ( Math.abs(pr - power) < 1e-12 )
			power = pr;

		var j;
		var Krow = this.K.row(i);
		if ( power == 2 ) {
			for ( j = 0; j < this.rowlength ; j++)
				Krow[j] *= Krow[j] ;
		}
		else {
			for ( j = 0; j < this.rowlength ; j++)
				Krow[j] = Math.pow( Krow[j], power );
		}

		// Mark row as updated:
		this.needUpdate[i] = false;
		this.previouskernelpar[i] = this.kernelpar;
		this.rowsToUpdate--;
	}
}

//////////::
// Parallelized Kernel Cache
/*
	If N < 20000, then K < 3 GB can be precomputed entirely with
	(#CPUs-1) processors in the background.

	for get_row(i):
	if K[i] is available, return K[i]
	otherwise, K[i] is computed by the main thread and returned.

//////////////////
function kernelCacheParallel( X , kerneltype, kernelpar, cacheSize) {
	// Create a kernel cache of a given size (number of entries)

	if ( typeof(kerneltype) === 'undefined')
		var kerneltype = "rbf";
	if ( typeof(kernelpar) === 'undefined')
		var kernelpar = kernel_default_parameter(kerneltype, size(X,2));
	if  ( typeof(cacheSize) == "undefined" )
		var cacheSize = Math.floor(3 * 1024 * 1024 * 1024 / 8) ; // 3 GB
													   		// = enough for the entire K with 20,000 data
	if ( cacheSize < X.length * X.length )
		return undefined;	// cannot work in this setting

	this.kerneltype = kerneltype;
	this.kernelpar = kernelpar;
	this.X = matrixCopy(X);

	this.cachesize = cacheSize; // in number of Kij entries
	this.size = Math.min( Math.floor(cacheSize / X.length), X.length ); // in number of rows;
	this.rowlength = X.length;

	this.K = zeros(this.size, X.length );	// entire K
	this.rowindex = new Array(); // list of rows indexes: rowindex[i] = index of X_j whose row is store in K[i]
	this.LRU = new Array(); 	// list of last recently used rows (index in K)
								// the last recently used is at the beginning of the list

	// workers[t] work on indexes from t*size/CPUs to (t+1)*size/CPUs workers[0] is main thread (this)
	this.CPUs = 4;
	this.workers = new Array( CPUs );
	for ( var t=1; t< CPUs; t++) {
		this.workers[t] = new Worker( "kernelworker.js" );
		// copy data and setup worker
		this.workers[t].postMessage( {kerneltype: kerneltype, kernelpar: kernelpar, X: X, cachesize = cacheSize, index: t} );
	}
}

kernelCacheParallel.prototype.get_row = function ( row ) {
	var j;
	var Krow;
	var i = this.rowindex.indexOf( row );

	if ( i >= 0 ) {
		// requested row already in cache
		Krow = this.K[i]; // for thread safe :  vectorCopy(K[i]);
	}
	else {
		// Need to compute the new row

		// Find an index to store the row
		if (this.rowindex.length < this.size) {
			// There is space for this row, so append at the end
			i = this.rowindex.length;
			this.rowindex.push( row ) ;
		}
		else {
			// Need to erase the last recenty used:
			i = this.LRU[0];
			this.rowindex[i] = row;
		}

		// Compute kernel row
		for (j = 0; j < this.rowlength; j++) {
			Kij = kernel(this.X[row], this.X[j], this.kerneltype, this.kernelpar);
			if ( Math.abs(Kij) > 1e-8)
				this.K[i][j] = Kij;
		}
		Krow = this.K[i];
	}

	// Update LRU
	var alreadyInLRU = this.LRU.indexOf(i);
	if ( alreadyInLRU >= 0)
		this.LRU.splice(alreadyInLRU, 1);
	this.LRU.push(i);

	return Krow;
}
*/
///////////////////////////////////////////
/// Generic functions for machine learning
//////////////////////////////////////////
function train( model, X, Y ) {
	switch( type(model).split(":")[0] ) {
	case "Classifier":
	case "Regression":
	case "SwitchingRegression":
		return model.train(X,Y);
		break;
	case "DimReduction":
		return model.train(X);
		break;
	default:
		return undefined;
	}
}
function predict( model, X, mode ) {
	switch( type(model).split(":")[0] ) {
	case "Classifier":
	case "Regression":
		return model.predict(X);
		break;
	case "SwitchingRegression":
		return model.predict(X,mode);
		break;
	default:
		return undefined;
	}
}
function test( model, X, Y ) {
	switch( type(model).split(":")[0] ) {
	case "Classifier":
	case "Regression":
	case "SwitchingRegression":
		return model.test(X,Y);
		break;
	default:
		return undefined;
	}
}
///////////////////////////////////////////
/// Generic class for Classifiers
//////////////////////////////////////////
/**
 * @constructor
 */
function Classifier (algorithm, params ) {

	if (typeof(algorithm) == "string")
		algorithm = eval(algorithm);

	this.type = "Classifier:" + algorithm.name;

	this.algorithm = algorithm.name;
	this.userParameters = params;

	// this.type = "classifier";

	// Functions that depend on the algorithm:
	this.construct = algorithm.prototype.construct;

	// Training functions
	this.train = algorithm.prototype.train;
	if ( algorithm.prototype.trainBinary )
		this.trainBinary = algorithm.prototype.trainBinary;
	if ( algorithm.prototype.trainMulticlass )
		this.trainMulticlass = algorithm.prototype.trainMulticlass;
	if ( algorithm.prototype.update )
		this.update = algorithm.prototype.update; //online training

	// Prediction functions
	this.predict = algorithm.prototype.predict;
	if ( algorithm.prototype.predictBinary )
		this.predictBinary = algorithm.prototype.predictBinary;
	if ( algorithm.prototype.predictMulticlass )
		this.predictMulticlass = algorithm.prototype.predictMulticlass;
	if ( algorithm.prototype.predictscore )
		this.predictscore = algorithm.prototype.predictscore;
	if ( algorithm.prototype.predictscoreBinary )
		this.predictscoreBinary = algorithm.prototype.predictscoreBinary;


	// Tuning function
	if ( algorithm.prototype.tune )
		this.tune = algorithm.prototype.tune;

	// Initialization depending on algorithm
	this.construct(params);

}

Classifier.prototype.construct = function ( params ) {
	// Read this.params and create the required fields for a specific algorithm
}

Classifier.prototype.tune = function ( X, y, Xv, yv ) {
	// Main function for tuning an algorithm on a given training set (X,labels) by cross-validation
	//	or by error minimization on the validation set (Xv, labelsv);

	/*
		1) apply cross validation (or test on (Xv,yv) ) to estimate the performance of all sets of parameters
			in this.parameterGrid

		2) pick the best set of parameters and train the final model on all data
			store this model in this.*
	*/

	var validationSet = ( typeof(Xv) != "undefined" && typeof(yv) != "undefined" );

	var n = 0;
	var parnames = new Array();

	if (typeof(this.parameterGrid) != "undefined" ) {
		for ( var p in this.parameterGrid ) {
			parnames[n] = p;
			n++;
		}
	}
	var validationErrors;
	var minValidError = Infinity;

	if ( n == 0 ) {
		// no hyperparameter to tune, so just train and test
		if ( validationSet ) {
			this.train(X,y);
			var stats = 1.0 - this.test(Xv,yv);
		}
		else
			var stats = 1.0 - this.cv(X,y);
		minValidError = stats ;
	}
	else if( n == 1 ) {
		// Just one hyperparameter
		var validationErrors = zeros(this.parameterGrid[parnames[0]].length);
		var bestpar;

		for ( var p =0; p <  this.parameterGrid[parnames[0]].length; p++ ) {
			this[parnames[0]] = this.parameterGrid[parnames[0]][p];

			console.log("Trying " + parnames[0] + " = " + this[parnames[0]] );
			if ( validationSet ) {
				// use validation set
				this.train(X,y);
				var stats = 1.0 - this.test(Xv,yv);
			}
			else {
				// do cross validation
				var stats = 1.0 - this.cv(X,y);
			}
			validationErrors[p] = stats;
			if ( stats < minValidError ) {
				minValidError = stats;
				bestpar = this[parnames[0]];
				if ( minValidError < 1e-4 )
					break;
			}
			notifyProgress( p / this.parameterGrid[parnames[0]].length ) ;
		}

		// retrain with all data
		this[parnames[0]] = bestpar;
		if ( validationSet )
			this.train( mat([X,Xv], true),reshape( mat([y,yv],true), y.length+yv.length, 1));
		else
			this.train(X,y);
	}
	else if ( n == 2 ) {
		// 2 hyperparameters
		validationErrors = zeros(this.parameterGrid[parnames[0]].length, this.parameterGrid[parnames[1]].length);
		var bestpar = new Array(2);

		var iter = 0;
		for ( var p0 =0; p0 <  this.parameterGrid[parnames[0]].length; p0++ ) {
			this[parnames[0]] = this.parameterGrid[parnames[0]][p0];

			for ( var p1 =0; p1 <  this.parameterGrid[parnames[1]].length; p1++ ) {
				this[parnames[1]] = this.parameterGrid[parnames[1]][p1];

				console.log("Trying " + parnames[0] + " = " + this[parnames[0]] + ", " + parnames[1] + " = " + this[parnames[1]]);

				if ( validationSet ) {
					// use validation set
					this.train(X,y);
					var stats = 1.0 - this.test(Xv,yv);
				}
				else {
					// do cross validation
					var stats = 1.0 - this.cv(X,y);
				}
				validationErrors.val[p0*this.parameterGrid[parnames[1]].length + p1] = stats;
				if ( stats < minValidError ) {
					minValidError = stats ;
					bestpar[0] = this[parnames[0]];
					bestpar[1] = this[parnames[1]];
					if ( minValidError < 1e-4 )
						break;

				}
				iter++;
				notifyProgress( iter / (this.parameterGrid[parnames[0]].length *this.parameterGrid[parnames[1]].length) ) ;
			}
			if ( minValidError < 1e-4 )
				break;
		}

		// retrain with all data
		this[parnames[0]] = bestpar[0];
		this[parnames[1]] = bestpar[1];
		if( validationSet )
			this.train( mat([X,Xv], true),reshape( mat([y,yv],true), y.length+yv.length, 1));
		else
			this.train(X,y);
	}
	else {
		// too many hyperparameters...
		error("Too many hyperparameters to tune.");
	}

	notifyProgress( 1 ) ;
	return {error: minValidError,  validationErrors: validationErrors};
}

Classifier.prototype.train = function (X, labels) {
	// Training function: should set trainable parameters of the model
	//					  and return the training error rate.

	// should start by checking labels (and converting them to suitable numerical values):
	var y = this.checkLabels( labels ) ;
	/*
	// Call training function depending on binary/multi-class case
	if ( this.labels.length > 2 ) {
		this.trainMulticlass(X, y);
	}
	else {
		this.trainBinary(X, y);
	}
	*/
	// Return training error rate:
	// return (1 - this.test(X, labels)); // not a good idea... takes time...
	return this.info();
}
/*
Classifier.prototype.trainBinary = function (X, y) {
	// Training function for binary classifier
	// assume y in {-1, +1}
}
Classifier.prototype.trainMulticlass = function (X, y) {
	// Training function for multi-class case
	// assume y in {0, ..., Nclasses-1}
}
*/
Classifier.prototype.update = function (X, labels) {
	// Online training function: should update the classifier
	//	with additional training data in (X,labels)
	error("Error in " + this.algorithm + ".update(): Online training is not implemented for this classifier");
	return undefined;
}

Classifier.prototype.predict = function (X) {
	// Prediction function
	var y = 0;

	// should return original labels converted from the numeric ones)
	var labels = this.recoverLabels( y ) ;
	return labels;
}

/*
Classifier.prototype.predictscore = function( x ) {
	// Return a real-valued score for the categories
}
*/
Classifier.prototype.test = function (X, labels) {
	// Test function: return the recognition rate (use this.predict to get the predictions)
	var prediction = this.predict( X ) ;

	var i;
	var errors = 0;
	if ( !isScalar(labels) ) {
		for ( i=0; i < labels.length; i++) {
			if ( prediction[i] != labels[i] ){
				errors++;
				//console.log("Prediction error on sample " + i + " :  " + prediction[i] + "/" + labels[i]);
			}
		}
		return (labels.length - errors)/labels.length; // javascript uses floats for integers, so this should be ok.
	}
	else {
		return ( prediction == labels);
	}
}

Classifier.prototype.cv = function ( X, labels, nFolds) {
	// Cross validation
	if ( typeof(nFolds) == "undefined" )
		var nFolds = 5;

	const N = labels.length;
	const foldsize = Math.floor(N / nFolds);

	// Random permutation of the data set
	var perm = randperm(N);

	// Start CV
	var errors = zeros (nFolds);

	var Xtr, Ytr, Xte, Yte;
	var i;
	var fold;
	for ( fold = 0; fold < nFolds - 1; fold++) {

		Xte = get(X, get(perm, range(fold * foldsize, (fold+1)*foldsize)), []);
		Yte = get(labels, get(perm, range(fold * foldsize, (fold+1)*foldsize)) );

		var tridx = new Array();
		for (i=0; i < fold*foldsize; i++)
			tridx.push(perm[i]);
		for (i=(fold+1)*foldsize; i < N; i++)
			tridx.push(perm[i]);

		Xtr =  get(X, tridx, []);
		Ytr = get(labels, tridx);

		this.train(Xtr, Ytr);
		errors[fold] = this.test(Xte,Yte);
	}
	// last fold:
	this.train( get(X, get(perm, range(0, fold * foldsize)), []), get(labels, get(perm, range(0, fold * foldsize ) ) ) );
	errors[fold] = this.test(get(X, get(perm, range(fold * foldsize, N)), []), get(labels, get(perm, range(fold * foldsize, N)) ) );

	// Retrain on all data
	this.train(X, labels);

	// Return kFold error (or recognition rate??)
	return mean(errors);
}

Classifier.prototype.loo = function ( X, labels) {
	return this.cv(X, labels, labels.length);
}

Classifier.prototype.checkLabels = function ( labels, binary01 ) {
	// Make list of labels and return corresponding numerical labels for training

	// Default check : make labels in { 0,..., Nclasses-1 } for multi-clas case
	//							or 	{-1, +1} for binary case (unless binary01 is true)

	var y = zeros(labels.length); // vector of numerical labels
	this.labels = new Array(); // array of original labels : this.labels[y[i]] = labels[i]
	this.numericlabels = new Array();

	var i;
	for ( i = 0; i<labels.length; i++) {
		if ( typeof(labels[i]) != "undefined" ) {
			y[i] = this.labels.indexOf( labels[i] );
			if( y[i] < 0 ) {
				y[i] = this.labels.length;
				this.labels.push( labels[i] );
				this.numericlabels.push( y[i] );
			}
		}
		else {
			y[i] = 0;	// undefined labels = 0 (for sparse labels vectors)
			if ( this.labels.indexOf(0) < 0 ) {
				this.labels.push(0);
				this.numericlabels.push(0);
			}
		}
	}

	// Correct labels in the binary case => y in {-1, +1}
	if ( (arguments.length == 1 || !binary01) && this.labels.length == 2 ) {
		var idx0 = find(isEqual(y, 0) ) ;
		set(y, idx0, minus(ones(idx0.length)));
		this.numericlabels[this.numericlabels.indexOf(0)] = -1;
	}

	return y;
}

Classifier.prototype.recoverLabels = function ( y ) {
	// Return a vector of labels according to the original labels in this.labels
	// from a vector of numerical labels y

	// Default check : make labels in { 0,..., Nclasses-1 } for multi-clas case
	//							or 	{-1, +1} for binary case


	if ( typeof(y) == "number" )
		return  this.labels[this.numericlabels.indexOf( y ) ];
	else {
		var labels = new Array(y.length);// vector of true labels

		var i;
		for ( i = 0; i < y.length; i++) {
			labels[i] = this.labels[this.numericlabels.indexOf( y[i] )];
		}
		return labels;
	}
}
/**
 * @return {string}
 */
Classifier.prototype.info = function () {
	// Print information about the model

	var str = "{<br>";
	var i;
	var Functions = new Array();
	for ( i in this) {
		switch ( type( this[i] ) ) {
			case "string":
			case "boolean":
			case "number":
				str += i + ": " + this[i] + "<br>";
				break;
			case "vector":
				str += i + ": " + printVector(this[i]) + "<br>";
				break;
			case "spvector":
				str += i + ": " + printVector(fullVector(this[i])) + "<br>";
				break;
			case "matrix":
				str += i + ": matrix of size " + this[i].m + "-by-" + this[i].n + "<br>";
				break;
			case "Array":
				str += i + ": Array of size " + this[i].length + "<br>";
				break;
			case "function":
				if ( typeof(this[i].name)=="undefined" || this[i].name.length == 0 )
					Functions.push( i );
				else
					str += i + ": " + this[i].name + "<br>";
				break;
			default:
				str += i + ": " + typeof(this[i]) + "<br>";
				break;
		}
	}
	str += "<i>Functions: " + Functions.join(", ") + "</i><br>";
	str += "}";
	return str;
}

/* Utility function
	return true if x contain a single data instance
			false otherwise
*/
Classifier.prototype.single_x = function ( x ) {
	var tx = type(x);
	return (tx == "number" || ( this.dim_input > 1 && (tx == "vector" || tx == "spvector" ) ) ) ;
}

//////////////////////////////////////////////////
/////		Linear Discriminat Analysis (LDA)
///////////////////////////////////////////////////

function LDA ( params ) {
	var that = new Classifier ( LDA, params);
	return that;
}
LDA.prototype.construct = function (params) {

	// Default parameters:

	// Set parameters:
	var i;
	if ( params) {
		for (i in params)
			this[i] = params[i];
	}

	// Parameter grid for automatic tuning:
	this.parameterGrid = {   };
}

LDA.prototype.tune = function ( X, labels ) {
	var recRate = this.cv(X, labels);
	return {error: (1-recRate), validationErrors: [(1-recRate)]};
}

LDA.prototype.train = function ( X, labels ) {
	// Training function

	// should start by checking labels (and converting them to suitable numerical values):
	var y = this.checkLabels( labels ) ;

	// Call training function depending on binary/multi-class case
	if ( this.labels.length > 2 ) {
		this.trainMulticlass(X, y);
	}
	else {
		var trainedparams = this.trainBinary(X, y);
		this.w = trainedparams.w;
		this.b = trainedparams.b;
		this.dim_input = size(X,2);
	}
	/* and return training error rate:
	return (1 - this.test(X, labels));	*/
	return this.info();
}
LDA.prototype.trainBinary = function ( X, y ) {

	var i1 = find(isEqual(y,1));
	var i2 = find(isEqual(y,-1));
	var X1 = getRows(X, i1);
	var X2 = getRows(X, i2);
	var mu1 = mean(X1,1);
	var mu2 = mean(X2,1);
	var mudiff = sub(mu1, mu2);
	var musum = add(mu1, mu2);

	var X1centered = sub(X1, mul(ones(i1.length), mu1));
	var X2centered = sub(X2, mul(ones(i2.length), mu2));
	var Sigma = add( mul(transpose(X1centered), X1centered), mul(transpose(X2centered), X2centered) ) ;

	Sigma = entrywisediv( Sigma , y.length - 2 );

	var w = solve(Sigma, mudiff.val );
	var b = Math.log( i1.length / i2.length ) - 0.5 * mul(musum, w);

	return {w: w, b: b, Sigma: Sigma, mu: [mu1, mu2] };
}
LDA.prototype.trainMulticlass = function ( X, y) {
	// Use the 1-against-all decomposition

	const dim = size(X, 2);
	this.dim_input = dim;

	const Nclasses = this.labels.length;

	var k;
	var idx;
	var Xk;
	var mu = new Array(Nclasses);

	this.priors = zeros(Nclasses);

	var Xkcentered;

	var Sigma = zeros(dim,dim);

	for ( k= 0; k < Nclasses; k++) {

		idx = find(isEqual(y,k));
		this.priors[k] = idx.length / y.length;

		Xk = getRows(X, idx);

		mu[k] = mean(Xk,1).val;

		Xkcentered = sub(Xk, outerprod(ones(idx.length), mu[k]));

		Sigma = add( Sigma , mul(transpose(Xkcentered), Xkcentered));
	}

	Sigma = entrywisediv( Sigma , y.length - Nclasses );

	this.Sigma = Sigma;
	this.mu = mu;

	this.SigmaInv = inv(Sigma);
}

LDA.prototype.predict = function ( x ) {
	if ( this.labels.length > 2)
		return this.predictMulticlass( x ) ;
	else
		return this.predictBinary( x );
}
LDA.prototype.predictBinary = function ( x ) {

	var scores = this.predictscoreBinary( x , this.w, this.b);
	if (typeof(scores) != "undefined")
		return this.recoverLabels( sign( scores ) );
	else
		return undefined;
}
LDA.prototype.predictMulticlass = function ( x ) {
	// One-against-all approach

	var scores = this.predictscore( x );
	if (typeof(scores) != "undefined") {

		if ( type ( x ) == "matrix" ) {
			// multiple preidctions for multiple test data
			var i;
			var y = new Array(x.length );
			for ( i = 0; i < x.length; i++)  {
				y[i] = findmax ( scores.row(i) ) ;
			}
			return this.recoverLabels( y );
		}
		else {
			// single prediction
			return this.recoverLabels( argmax( scores ) );
		}

	}
	else
		return undefined;
}

LDA.prototype.predictscore = function( x ) {
	if ( this.labels.length > 2) {
		if ( this.single_x( x ) ) {
			var k;
			var output = log(this.priors);

			for ( k = 0; k < this.mu.length; k++)  {
				var diff = sub(x, this.mu[k]);
				output[k] -= 0.5 * mul(diff, mul(this.SigmaInv, diff) );
			}

			return output;
		}
		else {
			var k;
			var i;
			var output = zeros(x.length, this.labels.length);
			for ( i= 0; i< x.length; i++) {
				for ( k = 0; k < this.mu.length; k++)  {
					var diff = sub(x.row(i), this.mu[k]);
					output.val[i*output.n + k] = Math.log(this.priors[k]) - 0.5 * mul(diff, mul(this.SigmaInv, diff) );
				}
			}
			return output;
		}
	}
	else
		return this.predictscoreBinary( x, this.w, this.b );
}
LDA.prototype.predictscoreBinary = function( x , w, b ) {
	var output;
	if ( this.single_x( x ) )
		output = b + mul(x, w);
	else
		output = add( mul(x, w) , b);
	return output;
}
//////////////////////////////////////////////////
/////		Quadratic Discriminat Analysis (QDA)
///////////////////////////////////////////////////

function QDA ( params ) {
	var that = new Classifier ( QDA, params);
	return that;
}
QDA.prototype.construct = function (params) {

	// Default parameters:

	// Set parameters:
	var i;
	if ( params) {
		for (i in params)
			this[i] = params[i];
	}

	// Parameter grid for automatic tuning:
	this.parameterGrid = {   };
}

QDA.prototype.tune = function ( X, labels ) {
	var recRate = this.cv(X, labels);
	return {error: (1-recRate), validationErrors: [(1-recRate)]};
}

QDA.prototype.train = function ( X, labels ) {
	// Training function

	// should start by checking labels (and converting them to suitable numerical values):
	var y = this.checkLabels( labels ) ;

	// Call training function depending on binary/multi-class case
	if ( this.labels.length > 2 ) {
		this.trainMulticlass(X, y);
	}
	else {
		var trainedparams = this.trainBinary(X, y);
		this.mu = trainedparams.mu;
		this.Sigma = trainedparams.Sigma;
		this.Sigma_inv = trainedparams.Sigma_inv;
		this.b = trainedparams.b;
		this.dim_input = size(X,2);
	}
	/* and return training error rate:
	return (1 - this.test(X, labels));	*/
	return this.info();
}
QDA.prototype.trainBinary = function ( X, y ) {

	var i1 = find(isEqual(y,1));
	var i2 = find(isEqual(y,-1));
	var X1 = getRows(X, i1);
	var X2 = getRows(X, i2);
	var mu1 = mean(X1,1).val;
	var mu2 = mean(X2,1).val;

	var C1 = cov(X1);
	var C2 = cov(X2);

	var Sigma_inv = [ inv(C1), inv(C2) ];

	var b = Math.log( i1.length / i2.length ) + 0.5 * Math.log(det(C2) / det(C1) ) ;

	return {mu: [mu1, mu2], Sigma: [C1, C2], Sigma_inv: Sigma_inv, b: b };
}
QDA.prototype.trainMulticlass = function ( X, y) {
	// Use the 1-against-all decomposition

	const dim = size(X, 2);
	this.dim_input = dim;

	const Nclasses = this.labels.length;

	var k;
	var idx;
	var Xk;
	this.priors = zeros(Nclasses);
	var mu = new Array(Nclasses);
	var Sigma = new Array(Nclasses);
	var Sigma_inv = new Array(Nclasses);
	var Sigma_det = new Array(Nclasses);

	for ( k= 0; k < Nclasses; k++) {

		idx = find(isEqual(y,k));
		this.priors[k] = idx.length / y.length;

		Xk = getRows(X, idx);

		mu[k] = mean(Xk,1).val;
		Sigma[k] = cov(Xk);
		Sigma_inv[k] = inv(Sigma[k]);
		Sigma_det[k] = det(Sigma[k]);
	}

	this.Sigma = Sigma;
	this.mu = mu;
	this.Sigma_inv = Sigma_inv;
	this.Sigma_det = Sigma_det;
}
QDA.prototype.predict = function ( x ) {
	if ( this.labels.length > 2) {
		return this.predictMulticlass( x );
	}
	else
		return this.predictBinary( x );
}
QDA.prototype.predictBinary = function ( x ) {

	var scores = this.predictscoreBinary( x , this.w, this.b);
	if (typeof(scores) != "undefined")
		return this.recoverLabels( sign( scores ) );
	else
		return undefined;
}
QDA.prototype.predictMulticlass = function ( x ) {
	// One-against-all approach

	var scores = this.predictscore( x );
	if (typeof(scores) != "undefined") {

		if ( type ( x ) == "matrix" ) {
			// multiple preidctions for multiple test data
			var i;
			var y = new Array(x.length );
			for ( i = 0; i < x.length; i++)  {
				y[i] = findmax ( scores.row(i) ) ;
			}
			return this.recoverLabels( y );
		}
		else {
			// single prediction
			return this.recoverLabels( argmax( scores ) );
		}

	}
	else
		return undefined;
}

QDA.prototype.predictscore = function( x ) {
	if ( this.labels.length > 2) {
		if ( this.single_x( x ) ) {
			var k;
			var output = log(this.priors);

			for ( k = 0; k < this.mu.length; k++)  {
				var diff = sub(x, this.mu[k]);
				output[k] -= 0.5 * mul(diff, mul(this.Sigma_inv[k], diff) );
				output[k] -= 0.5 * Math.log(this.Sigma_det[k]);
			}

			return output;
		}
		else {
			var k;
			var i;
			var output = zeros(x.length, this.labels.length);
			for ( i= 0; i< x.length; i++) {
				for ( k = 0; k < this.mu.length; k++)  {
					var diff = sub(x.row(i), this.mu[k]);
					output.val[i*output.n + k] = Math.log(this.priors[k]) - 0.5 * mul(diff, mul(this.Sigma_inv[k], diff) ) - 0.5 * Math.log(this.Sigma_det[k]);
				}	// TODO store these logs in the model...
			}
			return output;
		}
	}
	else
		return this.predictscoreBinary( x );
}
QDA.prototype.predictscoreBinary = function( x ) {
	var output;
	if ( this.single_x( x ) ) {
		output = this.b;
		var x_mu1 = sub(x, this.mu[0]);
		var x_mu2 = sub(x, this.mu[1]);

		output += -0.5 * mul( x_mu1, mul(this.Sigma_inv[0], x_mu1)) + 0.5 * mul( x_mu2, mul(this.Sigma_inv[1], x_mu2));
	}
	else {
		output = zeros(x.length);
		for ( var i=0; i < x.length; i++) {
			output[i] = this.b;
			var xi = x.row(i);
			var x_mu1 = sub(xi, this.mu[0]);
			var x_mu2 = sub(xi, this.mu[1]);

			output[i] += -0.5 * mul( x_mu1, mul(this.Sigma_inv[0], x_mu1)) + 0.5 * mul( x_mu2, mul(this.Sigma_inv[1], x_mu2));
		}
	}
	return output;
}

//////////////////////////////////////////////////
/////		Perceptron
///////////////////////////////////////////////////

function Perceptron ( params ) {
	var that = new Classifier ( Perceptron, params);
	return that;
}
Perceptron.prototype.construct = function (params) {

	// Default parameters:

	this.Nepochs = 100;
	this.learningRate = 0.9;

	// Set parameters:
	var i;
	if ( params) {
		for (i in params)
			this[i] = params[i];
	}

	// Parameter grid for automatic tuning:
	this.parameterGrid = { "learningRate" : range(0.1,1,0.1) };
}

Perceptron.prototype.train = function ( X, labels ) {
	// Training function

	// should start by checking labels (and converting them to suitable numerical values):
	var y = this.checkLabels( labels ) ;

	// Call training function depending on binary/multi-class case
	if ( this.labels.length > 2 ) {
		this.trainMulticlass(X, y);
		// and return training error rate:
		return (1 - this.test(X, labels));
	}
	else {
		var trainedparams = this.trainBinary(X, y);
		this.w = trainedparams.w;
		this.b = trainedparams.b;

		return trainedparams.trainingError;
	}
}
Perceptron.prototype.trainBinary = function ( Xorig, y ) {

	if ( type ( Xorig ) == "vector" )
		var X = mat([Xorig]); // make it a matrix
	else
		var X = Xorig;

	const N = y.length;
	const dim = X.n;
	this.dim_input = dim;
	var w_prev = zeros(dim);
	var w = zeros(dim);
	var b_prev;

	var errors=0;

	var i;
	var j;

	// Uniform Random init
	for (j=0;j<dim;j++)
		w[j] = -5 + 10*Math.random();
	var b = -5 + 10*Math.random();

	// Training
	var epoch = 0;
	var norm_diff=Infinity;
	while ( epoch < this.Nepochs && norm_diff > 0.0000001)  {
		errors = 0;
		w_prev = vectorCopy(w);
		b_prev = b;

		for(i = 0;i<N ;i++) {
			var Xi = X.row(i);
			var yp = this.predictscoreBinary(Xi, w, b);

			if(y[i] != Math.sign(yp) ) {
				errors++;
				saxpy(this.learningRate * y[i], Xi, w);
				/*
				for(j=0;j<dim;j++) {
					w[j] +=  this.learningRate * y[i] * Xi[j];
				}
				*/
				b -= this.learningRate * y[i];
			}
		}

		// Stopping criterion
		norm_diff = 0;
		for(j=0;j<dim;j++)
			norm_diff += (w[j] - w_prev[j]) * (w[j] - w_prev[j]);
		norm_diff += (b - b_prev) * (b-b_prev);

		epoch++;
	}

	// Return training error rate:
	return {trainingError: (errors / N), w: w, b: b };
}
Perceptron.prototype.trainMulticlass = function ( X, y) {
	// Use the 1-against-all decomposition

	const Nclasses = this.labels.length;

	var k;
	var yk;
	var trainedparams;

	// Prepare arrays of parameters to store all binary classifiers parameters
	this.b = new Array(Nclasses);
	this.w = new Array(Nclasses);

	for ( k = 0; k < Nclasses; k++) {

		// For all classes, train a binary classifier

		yk = sub(mul(isEqual( y, this.numericlabels[k] ), 2) , 1 ); // binary y for classe k = 2*(y==k) - 1 => in {-1,+1}

		trainedparams = this.trainBinary(X, yk );	// provide precomputed kernel matrix

		// and store the result in an array of parameters
		this.b[k] = trainedparams.b;
		this.w[k] = trainedparams.w;
	}
}

Perceptron.prototype.predict = function ( x ) {
	if ( this.labels.length > 2)
		return this.predictMulticlass( x ) ;
	else
		return this.predictBinary( x );
}
Perceptron.prototype.predictBinary = function ( x ) {

	var scores = this.predictscoreBinary( x , this.w, this.b);
	if (typeof(scores) != "undefined")
		return this.recoverLabels( sign( scores ) );
	else
		return undefined;
}
Perceptron.prototype.predictMulticlass = function ( x ) {
	// One-against-all approach

	var scores = this.predictscore( x );
	if (typeof(scores) != "undefined") {

		if ( type ( x ) == "matrix" ) {
			// multiple preidctions for multiple test data
			var i;
			var y = new Array(x.length );
			for ( i = 0; i < x.length; i++)  {
				y[i] = findmax ( scores.row(i) ) ;
			}
			return this.recoverLabels( y );
		}
		else {
			// single prediction
			return this.recoverLabels( argmax( scores ) );
		}

	}
	else
		return undefined;
}

Perceptron.prototype.predictscore = function( x ) {
	if ( this.labels.length > 2) {
		var k;
		var output = new Array(this.w.length);
		for ( k = 0; k < this.w.length; k++)  {
			output[k] = this.predictscoreBinary( x, this.w[k], this.b[k] );
		}
		if( type(x) == "matrix")
			return transpose(output) ; // matrix of scores is of size Nsamples-by-Nclasses
		else
			return output; 		// vector of scores for all classes
	}
	else
		return this.predictscoreBinary( x, this.w,  this.b );
}
Perceptron.prototype.predictscoreBinary = function( x , w, b ) {
	var output;
	if ( this.single_x( x ) )
		output = b + mul(x, w);
	else
		output = add( mul(x, w) , b);
	return output;
}

//////////////////////////////////////////////////
/////		MLP: Multi-Layer Perceptron
///////////////////////////////////////////////////
function MLP ( params) {
	var that = new Classifier ( MLP, params);
	return that;
}
MLP.prototype.construct = function (params) {

	// Default parameters:

	this.loss = "squared";
	this.hidden = 5;
	this.epochs = 1000;
	this.learningRate = 0.001;
	this.initialweightsbound = 0.01;


	this.normalization = "auto";

	// Set parameters:
	var i;
	if ( params) {
		for (i in params)
			this[i] = params[i];
	}

	// Parameter grid for automatic tuning:
	this.parameterGrid = {"hidden": [3, 5, 8, 12] } ;
}
MLP.prototype.train = function (X, labels) {
	// Training function

	// should start by checking labels (and converting them to suitable numerical values):
	var y = this.checkLabels( labels , true) ; // make y in {0,1} for the binary case

	// and normalize data
	if ( this.normalization != "none"  ) {
		var norminfo = normalize(X);
		this.normalization = {mean: norminfo.mean, std: norminfo.std};
		var Xn = norminfo.X;
	}
	else {
		var Xn = X;
	}

	// Call training function depending on binary/multi-class case
	if ( this.labels.length > 2 ) {
		this.trainMulticlass(Xn, y);
	}
	else
		this.trainBinary(Xn, y);
}
MLP.prototype.trainBinary = function ( X, y) {

	const N = X.m;
	const d = X.n;

	const minstepsize = Math.min(epsilon, 0.1 / ( Math.pow( 10.0, Math.floor(Math.log(N) / Math.log(10.0))) ) );

	var epsilon = this.learningRate;
	const maxEpochs = this.epochs;

	const hls = this.hidden;

	var deltaFunc;
	switch ( this.loss ) {
	case "crossentropy":
		deltaFunc = function ( yi, g ) {
						return (g-yi);
					} ;
		break;
	case "squared":
	default:
		deltaFunc = function ( yi, g ) {
						return (g-yi) * (1-g) * g;
					} ;
		break;
	}
	var h;
	var output;
	var delta_v;
	var delta_w;
	var xi;
	var index;
	var k;

	/* Initialize the weights */

	var Win = mulScalarMatrix( this.initialweightsbound, subMatrixScalar( rand(hls, d), 0.5 ) );
	var Wout = mulScalarVector( this.initialweightsbound, subVectorScalar( rand(hls), 0.5 ) );

	var bin = mulScalarVector( this.initialweightsbound/10, subVectorScalar( rand(hls), 0.5 ) );
	var bout = (this.initialweightsbound/10) * (Math.random() - 0.5) ;

//	var cost = 0;
	for(var epoch = 1; epoch<=maxEpochs; epoch++) {

		if( epoch % 100 == 0)
			console.log("Epoch " + epoch); // "cost : " + cost);

		if(epsilon >= minstepsize)
			epsilon *= 0.998;

		var seq = randperm(N); // random sequence for stochastic descent

		// cost = 0;
		for(var i=0; i < N; i++) {
			index = seq[i];
			xi = X.row( index );

			/* Hidden layer outputs h(x_i) */
			h =  tanh( addVectors( mulMatrixVector(Win, xi), bin ) );

			/* Output of output layer g(x_i) */
			output =  sigmoid( dot(Wout, h) + bout ) ;

/*
			var e = output - y[index] ; // XXX only squared loss here...
			cost += e * e;
	*/

			/* delta_i for the output layer derivative dJ_i/dv = delta_i h(xi) */
			delta_v = deltaFunc(y[index], output);

			/* Vector of dj's in the hidden layer derivatives dJ_i/dw_j = dj * x_i */
			delta_w = mulScalarVector(delta_v, Wout);

			for(k=0; k < hls; k++)
				delta_w[k] *=  (1.0 + h[k]) * (1.0 - h[k]); // for tanh units

			/* Update weights of output layer */
			saxpy( -epsilon*delta_v, h, Wout);
			/*for(var j=0; j<hls; j++)
				Wout[j] -= epsilon * delta_v * h[j]; */

			/* Update weights of hidden layer */
			var rk = 0;
			for(k=0; k<hls; k++) {
				var epsdelta = epsilon * delta_w[k];
				for(j=0; j<d; j++)
					Win.val[rk + j] -= epsdelta * xi[j];
				rk += d;
			}

			/* Update bias of both layers */
			saxpy( -epsilon, delta_w, bin);
			/*for(k=0; k<hls; k++)
			    bin[k] -= epsilon * delta_w[k];*/

			bout -= epsilon * delta_v;

		}
	}


	this.W = Win;
	this.V = Wout;
	this.w0 = bin;
	this.v0 = bout;
	this.dim_input = d;
}
MLP.prototype.trainMulticlass = function ( X, y) {

	const N = X.m;
	const d = X.n;
	const Q = this.labels.length;

	const minstepsize = Math.min(epsilon, 0.1 / ( Math.pow( 10.0, Math.floor(Math.log(N) / Math.log(10.0))) ) );

	var epsilon = this.learningRate;
	const maxEpochs = this.epochs;

	const hls = this.hidden;

	var outputFunc;
	var deltaFunc;
	switch ( this.loss ) {
	case "crossentropy":
		outputFunc = softmax;
		deltaFunc = function ( yi, g ) {
						var delta = minus(g);
						delta[yi] += 1;
						return delta;
					} ;
		break;
	case "squared":
	default:
		outputFunc = function (o) {
						var res=zeros(Q);
						for(var k=0; k<Q;k++)
							res[k] = sigmoid(o[k]);
						return res;
					};
		deltaFunc = function ( yi, g ) {
						var delta = vectorCopy(g);
						delta[yi] -= 1;
						for(var k=0; k < Q; k++)
							delta[k] *= (1-g[k])*g[k];
						return delta;
					} ;
		break;
	}

	var h;
	var output;
	var delta_v;
	var delta_w;
	var xi;
	var index;
	var k;

	/* Initialize the weights */

	var Win = mulScalarMatrix( this.initialweightsbound, subMatrixScalar( rand(hls, d), 0.5 ) );
	var Wout = mulScalarMatrix( this.initialweightsbound, subMatrixScalar( rand(Q, hls), 0.5 ) );

	var bin = mulScalarVector( this.initialweightsbound/10, subVectorScalar( rand(hls), 0.5 ) );
	var bout = mulScalarVector( this.initialweightsbound/10, subVectorScalar( rand(Q), 0.5 ) );

	for(var epoch = 1; epoch<=maxEpochs; epoch++) {
		if( epoch % 100 == 0) {
			console.log("Epoch " + epoch);
		}

		if(epsilon >= minstepsize)
			epsilon *= 0.998;

		var seq = randperm(N); // random sequence for stochastic descent

		for(var i=0; i < N; i++) {
			index = seq[i];
			xi = X.row( index );

			/* Output of hidden layer h(x_i) */
			h = tanh( addVectors( mulMatrixVector(Win, xi), bin ) );

			/* Output of output layer g(x_i) */
			output = outputFunc( addVectors(mulMatrixVector(Wout, h), bout ) );

			/* delta_i vector for the output layer derivatives dJ_i/dv_k = delta_ik h(xi) */
		  	delta_v = deltaFunc(y[index], output);

			/* Vector of dj's in the hidden layer derivatives dJ_i/dw_j = dj * x_i */
			delta_w = mulMatrixVector(transpose(Wout), delta_v);

			for(k=0; k < hls; k++)
				delta_w[k] *= (1.0 + h[k]) * (1.0 - h[k]); // for tanh units

			/* Update weights of output layer */
			var rk = 0;
			for(k=0; k<Q; k++) {
				var epsdelta = epsilon * delta_v[k];
				for(j=0; j<hls; j++)
					Wout.val[rk + j] -= epsdelta * h[j];
				rk += hls;
			}
			/* Update weights of hidden layer */
			var rk = 0;
			for(k=0; k<hls; k++) {
				var epsdelta = epsilon * delta_w[k];
				for(j=0; j<d; j++)
					Win.val[rk + j] -= epsdelta * xi[j];
				rk += d;
			}

			/* Update bias of both layers */
			saxpy( -epsilon, delta_w, bin);
			saxpy( -epsilon, delta_v, bout);

		}
	}

	this.W = Win;
	this.V = Wout;
	this.w0 = bin;
	this.v0 = bout;
	this.dim_input = d;

	this.outputFunc = outputFunc;
}
function sigmoid ( x ) {
	return 1 / (1 + Math.exp(-x));
}
function sigmoid_prim ( x ) {
	return (1 - x) * x; // if x = sigmoid(u)
}
function softmax( x ) {
	const d=x.length;
	var sum = 0;
	var res = zeros(d);
	var k;
	for ( k=0; k < d; k++) {
		res[k] = Math.exp(-x[k]);
		sum += res[k];
	}
	for ( k=0; k < d; k++)
		res[k] /= sum;
	return res;
}

MLP.prototype.predict = function ( x ) {
	if ( this.labels.length > 2)
		return this.predictMulticlass( x ) ;
	else
		return this.predictBinary( x );
}
MLP.prototype.predictBinary = function ( x ) {

	var scores = this.predictscore( x );
	if (typeof(scores) != "undefined")
		return this.recoverLabels( isGreaterOrEqual( scores, 0.5 ) );
	else
		return undefined;
}
MLP.prototype.predictMulticlass = function ( x ) {

	var scores = this.predictscore( x );
	if (typeof(scores) != "undefined") {

		if ( type ( x ) == "matrix" ) {
			// multiple predictions for multiple test data
			var i;
			var y = new Array(x.length );

			for ( i = 0; i < x.length; i++)
				y[i] = findmax ( scores.row(i) ) ;

			return this.recoverLabels( y );
		}
		else {
			// single prediction
			return this.recoverLabels( argmax( scores ) );
		}

	}
	else
		return undefined;
}

MLP.prototype.predictscore = function( x_unnormalized ) {
	// normalization
	var x;
	if (typeof(this.normalization) != "string" )
		x = normalize(x_unnormalized, this.normalization.mean, this.normalization.std);
	else
		x = x_unnormalized;

	// prediction
	if ( this.labels.length > 2) {
		var i;
		var k;
		var output;

		if ( this.single_x( x ) ) {

			/* Calcul des sorties obtenues sur la couche cachée */
			var hidden = tanh( addVectors( mulMatrixVector(this.W, x), this.w0 ) );

			/* Calcul des sorties obtenues sur la couche haute */
			var output = this.outputFunc( addVectors(mulMatrixVector(this.V, hidden), this.v0 ) );
			return output;
		}
		else {
			output = zeros(x.length, this.labels.length);
			for ( i=0; i < x.length; i++) {
				/* Calcul des sorties obtenues sur la couche cachée */
				var hidden = tanh( addVectors( mulMatrixVector(this.W, x.row(i)), this.w0 ) );

				/* Calcul des sorties obtenues sur la couche haute */
				var o =  this.outputFunc( addVectors(mulMatrixVector(this.V, hidden), this.v0 ) );
				setRows(output, [i], o);
			}
			return output;
		}
	}
	else {
		var i;
		var k;
		var output;

		if ( this.single_x(x) ) {

			/* Calcul des sorties obtenues sur la couche cachée */
			var hidden = tanh( addVectors( mulMatrixVector(this.W, x), this.w0 ) );

			/* Calcul des sorties obtenues sur la couche haute */
			var output = dot(this.V, hidden) + this.v0 ;
			return sigmoid(output);
		}
		else {
			output = zeros(x.length);
			for ( i=0; i < x.length; i++) {
				/* Calcul des sorties obtenues sur la couche cachée */
				var hidden = tanh( addVectors( mulMatrixVector(this.W, x.row(i)), this.w0 ) );

				/* Calcul des sorties obtenues sur la couche haute */
				var o = dot(this.V, hidden) + this.v0 ;
				output[i] = sigmoid(o);
			}
			return output;
		}
	}
}

/***************************************************
		Support Vector Machine (SVM)

	Training by SMO as implemented in LibSVM
	or as in LibLinear for linear classification

	Efficient use and updates of kernel cache
	for cross-validation and tuning of kernel parameters

****************************************************/
function SVM ( params) {
	var that = new Classifier ( SVM, params);
	return that;
}
SVM.prototype.construct = function (params) {

	// Default parameters:

	this.kernel = "linear";
	this.kernelpar = undefined;

	this.C = 1;

	this.onevsone = false;

	this.normalization = "auto";
	this.alphaseeding = {use: false, alpha: undefined, grad: undefined};

	// Set parameters:
	var i;
	if ( params) {
		for (i in params)
			this[i] = params[i];
	}

	// Parameter grid for automatic tuning:
	switch (this.kernel) {
		case "linear":
			this.parameterGrid = { "C" : [0.01, 0.1, 1, 5, 10, 100] };
			break;
		case "gaussian":
		case "Gaussian":
		case "RBF":
		case "rbf":
			// use multiple powers of 1/sqrt(2) for sigma => efficient kernel updates by squaring
			this.parameterGrid = { "kernelpar": pow(1/Math.sqrt(2), range(-1,9)), "C" : [ 0.1, 1, 5, 10, 50] };
			break;

		case "poly":
			this.parameterGrid = { "kernelpar": [3,5,7,9] , "C" : [0.1, 1, 5, 10, 50]  };
			break;
		case "polyh":
			this.parameterGrid = { "kernelpar": [3,5,7,9] , "C" : [0.1, 1, 5, 10, 50] };
			break;
		default:
			this.parameterGrid = undefined;
			break;
	}
}
SVM.prototype.tune = function ( X, labels, Xv, labelsv ) {
	// Tunes the SVM given a training set (X,labels) by cross-validation or using validation data

	/* Fast implementation uses the same kernel cache for all values of C
		and kernel updates when changing the kernelpar.

		We also use alpha seeding when increasing C.
	*/

	// Set the kernelpar range with the dimension
	if ( this.kernel == "rbf" ) {
		var saveKpGrid = zeros(this.parameterGrid.kernelpar.length);
		for ( var kp = 0; kp < this.parameterGrid.kernelpar.length ; kp ++) {
			saveKpGrid[kp] = this.parameterGrid.kernelpar[kp];
			if ( typeof(this.kernelpar) == "undefined")
				this.parameterGrid.kernelpar[kp] *= Math.sqrt( X.n );
		}
		if ( typeof(this.kernelpar) != "undefined")
			this.parameterGrid.kernelpar = mul(this.kernelpar, range(1.4,0.7,-0.1));
	}


	if ( arguments.length == 4 ) {
		// validation set (Xv, labelsv)

		if ( this.kernel == "linear" ) {
			// test all values of C
			var validationErrors = zeros(this.parameterGrid.C.length);
			var minValidError = Infinity;
			var bestC;

			for ( var c = 0; c < this.parameterGrid.C.length; c++) {
				this.C = this.parameterGrid.C[c];
				this.train(X,labels);
				validationErrors[c] = 1.0 - this.test(Xv,labelsv);
				if ( validationErrors[c] < minValidError ) {
					minValidError = validationErrors[c];
					bestC = this.C;
				}
			}
			this.C = bestC;

			this.train(mat([X,Xv]), mat([labels,labelsv]) ); // retrain with best values and all data
		}
		else {
			// grid of ( kernelpar, C) values
			var validationErrors = zeros(this.parameterGrid.kernelpar.length, this.parameterGrid.C.length);
			var minValidError = Infinity;

			var bestkernelpar;
			var bestC;

			var kc = new kernelCache( X , this.kernel, this.parameterGrid.kernelpar[0] );

			for ( var kp = 0; kp < this.parameterGrid.kernelpar.length; kp++) {
				this.kernelpar = this.parameterGrid.kernelpar[kp];
				if ( kp > 0 ) {
					kc.update( this.kernelpar );
				}
				for ( var c = 0; c < this.parameterGrid.C.length; c++) {
					this.C = this.parameterGrid.C[c];
					this.train(X,labels, kc);	// use the same kernel cache for all values of C
					validationErrors.set(kp,c, 1.0 - this.test(Xv,labelsv) );
					if ( validationErrors.get(kp,c) < minValidError ) {
						minValidError = validationErrors.get(kp,c);
						bestkernelpar = this.kernelpar;
						bestC = this.C;
					}
				}
			}
			this.kernelpar = bestkernelpar;
			this.C = bestC;
			this.train(mat([X,Xv], true), mat([labels,labelsv], true) ); // retrain with best values and all data
		}
	}
	else {

		// 5-fold Cross validation
		const nFolds = 5;

		const N = labels.length;
		const foldsize = Math.floor(N / nFolds);

		// Random permutation of the data set
		var perm = randperm(N);

		// Start CV
		if ( this.kernel == "linear" )
			var validationErrors = zeros(this.parameterGrid.C.length);
		else
			var validationErrors = zeros(this.parameterGrid.kernelpar.length,this.parameterGrid.C.length);


		var Xtr, Ytr, Xte, Yte;
		var i;
		var fold;
		for ( fold = 0; fold < nFolds - 1; fold++) {
			console.log("fold " + fold);
			notifyProgress ( fold / nFolds);
			Xte = get(X, get(perm, range(fold * foldsize, (fold+1)*foldsize)), []);
			Yte = get(labels, get(perm, range(fold * foldsize, (fold+1)*foldsize)) );

			var tridx = new Array();
			for (i=0; i < fold*foldsize; i++)
				tridx.push(perm[i]);
			for (i=(fold+1)*foldsize; i < N; i++)
				tridx.push(perm[i]);

			Xtr =  get(X, tridx, []);
			Ytr = get(labels, tridx);


			if ( this.kernel == "linear" ) {
				// test all values of C
				for ( var c = 0; c < this.parameterGrid.C.length; c++) {
					this.C = this.parameterGrid.C[c];
					console.log("training with C = " + this.C); // + " on " , tridx, Xtr, Ytr);
					this.train(Xtr,Ytr);
					validationErrors[c] += 1.0 - this.test(Xte,Yte) ;
				}
			}
			else {
				// grid of ( kernelpar, C) values

				var kc = new kernelCache( Xtr , this.kernel, this.parameterGrid.kernelpar[0] );

				for ( var kp = 0; kp < this.parameterGrid.kernelpar.length; kp++) {
					this.kernelpar = this.parameterGrid.kernelpar[kp];
					if ( kp > 0 ) {
						kc.update( this.kernelpar );
					}
					for ( var c = 0; c < this.parameterGrid.C.length; c++) {
						this.C = this.parameterGrid.C[c];
						console.log("Training with kp = " + this.kernelpar + " C = " + this.C);

						// alpha seeding: intialize alpha with optimal values for previous (smaller) C
						/* (does not help with values of C too different...
							if ( c == 0 )
								this.alphaseeding.use = false;
							else {
								this.alphaseeding.use = true;
								this.alphaseeding.alpha = this.alpha;
							}
						*/
						this.train(Xtr,Ytr, kc);	// use the same kernel cache for all values of C
						validationErrors.val[kp * this.parameterGrid.C.length + c] += 1.0 - this.test(Xte,Yte) ;
					}
				}
			}
		}
		console.log("fold " + fold);
		notifyProgress ( fold / nFolds);
		// last fold:
		Xtr = get(X, get(perm, range(0, fold * foldsize)), []);
		Ytr = get(labels, get(perm, range(0, fold * foldsize ) ) );
		Xte = get(X, get(perm, range(fold * foldsize, N)), []);
		Yte = get(labels, get(perm, range(fold * foldsize, N)) );

		if ( this.kernel == "linear" ) {
			// test all values of C
			for ( var c = 0; c < this.parameterGrid.C.length; c++) {
				this.C = this.parameterGrid.C[c];
				console.log("training with C = " + this.C);
				this.train(Xtr,Ytr);
				validationErrors[c] += 1.0 - this.test(Xte,Yte) ;
			}
		}
		else {
			// grid of ( kernelpar, C) values

			var kc = new kernelCache( Xtr , this.kernel, this.parameterGrid.kernelpar[0] );

			for ( var kp = 0; kp < this.parameterGrid.kernelpar.length; kp++) {
				this.kernelpar = this.parameterGrid.kernelpar[kp];
				if ( kp > 0 ) {
					kc.update( this.kernelpar );
				}
				for ( var c = 0; c < this.parameterGrid.C.length; c++) {
					this.C = this.parameterGrid.C[c];
					console.log("Training with kp = " + this.kernelpar + " C = " + this.C);
					// alpha seeding: intialize alpha with optimal values for previous (smaller) C
					/*
					if ( c == 0 )
						this.alphaseeding.use = false;
					else {
						this.alphaseeding.use = true;
						this.alphaseeding.alpha = this.alpha;
					}*/

					this.train(Xtr,Ytr, kc);	// use the same kernel cache for all values of C
					validationErrors.val[kp * this.parameterGrid.C.length + c] += 1.0 - this.test(Xte,Yte) ;
				}
			}
		}

		// Compute Kfold errors and find best parameters
		var minValidError = Infinity;
		var bestC;
		var bestkernelpar;

		if ( this.kernel == "linear" ) {
			for ( var c = 0; c < this.parameterGrid.C.length; c++) {
				validationErrors[c] /= nFolds;
				if ( validationErrors[c] < minValidError ) {
					minValidError = validationErrors[c];
					bestC = this.parameterGrid.C[c];
				}
			}
			this.C = bestC;
		}
		else {
			// grid of ( kernelpar, C) values
			for ( var kp = 0; kp < this.parameterGrid.kernelpar.length; kp++) {
				for ( var c = 0; c < this.parameterGrid.C.length; c++) {
					validationErrors.val[kp * this.parameterGrid.C.length + c] /= nFolds;
					if(validationErrors.val[kp * this.parameterGrid.C.length + c] < minValidError ) {
						minValidError = validationErrors.val[kp * this.parameterGrid.C.length + c];
						bestC = this.parameterGrid.C[c];
						bestkernelpar = this.parameterGrid.kernelpar[kp];
					}
				}
			}
			this.C = bestC;
			this.kernelpar = bestkernelpar;
		}

		//this.alphaseeding.use = false;

		// Retrain on all data
		this.train(X, labels);
		notifyProgress ( 1 );
	}

	// Restore the dimension-free kernelpar range
	if ( this.kernel == "rbf" ) {
		for ( var kp = 0; kp < this.parameterGrid.kernelpar.length ; kp ++) {
			this.parameterGrid.kernelpar[kp] = saveKpGrid[kp];
		}
	}

	this.validationError = minValidError;
	return {error: minValidError, validationErrors: validationErrors};
}
SVM.prototype.train = function (X, labels, kc) {
	// Training function

	// should start by checking labels (and converting them to suitable numerical values):
	var y = this.checkLabels( labels ) ;

	// and normalize data
	if ( this.normalization != "none" && this.kernel != "linear" ) {	// linear kernel should yield an interpretable model
		var norminfo = normalize(X);
		this.normalization = {mean: norminfo.mean, std: norminfo.std};
		var Xn = norminfo.X;
	}
	else {
		var Xn = X;
	}

	// Call training function depending on binary/multi-class case
	if ( this.labels.length > 2 ) {
		this.trainMulticlass(Xn, y, kc);
	}
	else {
		var trainedparams = this.trainBinary(Xn, y, kc);
		this.SVindexes = trainedparams.SVindexes;  // list of indexes of SVs
		this.SVlabels = trainedparams.SVlabels;
		this.SV = trainedparams.SV;
		this.alpha = trainedparams.alpha;
		this.b = trainedparams.b;
		this.K = trainedparams.K;	// save kernel matrix for further use (like tuning parameters)
		this.kernelcache = trainedparams.kernelcache;
		this.dim_input = trainedparams.dim_input; // set input dimension for checks during prediction
		if ( this.kernelcache ) {
			this.kernelpar = this.kernelcache.kernelpar;
			if ( this.dim_input > 1 )
				this.kernelFunc = this.kernelcache.kernelFunc;
			else
				this.kernelFunc = kernelFunction(this.kernel, this.kernelpar, "number"); // for scalar input kernelcache uses 1D-vectors
			this.sparseinput = (this.kernelcache.inputtype == "spvector");
		}

		this.w = trainedparams.w;
		this.alphaseeding.grad = trainedparams.grad;
	}

	// free kernel cache
	this.kernelcache = undefined;

	/* and return training error rate:
	if ( labels.length <= 2000 )
		return (1 - this.test(X, labels));
	else
		return "Training done. Training error is not automatically computed for large training sets.";
		*/
	return this.info();
}
SVM.prototype.trainBinary = function ( X, y, kc ) {

	// Training binary SVM with SMO

	// Prepare
	const C = this.C;

	// Use a different approach for linear kernel
	if ( this.kernel == "linear" ) { // && y.length  > 1000 ?
		// Liblinear-like faster algo for linear SVM
		return SVMlineartrain( X, y, true, C );
	}


	if (typeof(kc) == "undefined") {
		// create a new kernel cache if it is not provided
		var kc = new kernelCache( X , this.kernel, this.kernelpar );
	}

	var i;
	var j;
	const m = X.length;

	// linear cost
	var c = minus(ones(m));

	// Initialization
	var alpha;
	var grad;
	var b = 0;

	if( this.alphaseeding.use ) {
		alpha = vectorCopy(this.alphaseeding.alpha);
		grad = vectorCopy(this.alphaseeding.grad);
	}
	else {
		alpha = zeros(m);
		grad = vectorCopy(c);
	}

	// SMO algorithm
	var index_i;
	var index_j;
	var alpha_i;
	var alpha_j;
	var grad_i;
	var grad_j;
	var Q_i;
	var Q_j;

	// List of indexes of pos and neg examples
	var y_pos_idx = new Array();
	var y_neg_idx = new Array();
	for ( i=0; i < m; i++) {
		if ( y[i] > 0 )
			y_pos_idx.push(i);
		else
			y_neg_idx.push(i);
	}

	// Function computing Q[i,:] = y_i * y .* K[i,:]
	var computeQ_row = function ( i ) {
		var Qi = kc.get_row( i );
		var k;
		var ii;
		if ( y[i] > 0 ) {
			var m_neg = y_neg_idx.length;
			for ( k = 0; k < m_neg; k++ ) {
				ii = y_neg_idx[k];
				Qi[ii] = -Qi[ii];
			}
		}
		else {
			var m_pos = y_pos_idx.length;
			for ( k = 0; k < m_pos; k++ ) {
				ii = y_pos_idx[k];
				Qi[ii] = -Qi[ii];
			}
		}
		return Qi;
	};


	const tolalpha = 0.001; // tolerance to detect margin SV
	const Cup = C * (1-tolalpha) ;
	const Clow = C * tolalpha;

	const epsilon = 0.001; // TOL on the convergence
	var iter = 0;
	do {
		// working set selection => {index_i, index_j }
		var gradmax = -Infinity;
		var gradmin = Infinity;

		for (i=0; i< m; i++) {
			alpha_i = alpha[i];
			grad_i = grad[i];
			if ( y[i] == 1 && alpha_i < Cup && -grad_i > gradmax ) {
				index_i = i;
				gradmax = -grad_i;
			}
			else if ( y[i] == -1 && alpha_i > Clow  && grad_i > gradmax ) {
				index_i = i;
				gradmax = grad_i;
			}

			if ( y[i] == -1 && alpha_i < Cup && grad_i < gradmin ) {
				index_j = i;
				gradmin = grad_i;
			}
			else if ( y[i] == 1 && alpha_i > Clow && -grad_i < gradmin ) {
				index_j = i;
				gradmin = -grad_i;
			}

		}

		// Analytical solution
		i = index_i;
		j = index_j;

		//  Q[i][j] = y_i y_j K_ij
		Q_i = computeQ_row( i );
		Q_j = computeQ_row( j );
		//Q_i = entrywisemulVector( mulScalarVector( y[i] , y) , kc.get_row( i ) ); // ith row of Q
		//Q_j = entrywisemulVector( mulScalarVector( y[j] , y) , kc.get_row( j ) ); // jth row of Q

		alpha_i = alpha[i];
		alpha_j = alpha[j];
		grad_i = grad[i];
		grad_j = grad[j];

		// Update alpha and correct to remain in feasible set
		if ( y[i] != y[j] ) {
			var diff = alpha_i - alpha_j;
			var delta = -(grad_i + grad_j ) / ( Q_i[i] + Q_j[j] + 2 * Q_i[j] );
			alpha[j] = alpha_j + delta;
			alpha[i] = alpha_i + delta;

			if( diff > 0 ) {
				if ( alpha[j] < 0 ) {
					alpha[j] = 0;
					alpha[i] = diff;
				}
			}
			else
			{
				if(alpha[i] < 0)
				{
					alpha[i] = 0;
					alpha[j] = -diff;
				}
			}
			if(diff > 0 )
			{
				if(alpha[i] > C)
				{
					alpha[i] = C;
					alpha[j] = C - diff;
				}
			}
			else
			{
				if(alpha[j] > C)
				{
					alpha[j] = C;
					alpha[i] = C + diff;
				}
			}
		}
		else {
			var sum = alpha_i + alpha_j;
			var delta = (grad_i - grad_j) / ( Q_i[i] + Q_j[j] - 2 * Q_i[j] );
			alpha[i] = alpha_i - delta;
			alpha[j] = alpha_j + delta;

			if(sum > C)
			{
				if(alpha[i] > C)
				{
					alpha[i] = C;
					alpha[j] = sum - C;
				}
			}
			else
			{
				if(alpha[j] < 0)
				{
					alpha[j] = 0;
					alpha[i] = sum;
				}
			}
			if(sum > C)
			{
				if(alpha[j] > C)
				{
					alpha[j] = C;
					alpha[i] = sum - C;
				}
			}
			else
			{
				if(alpha[i] < 0)
				{
					alpha[i] = 0;
					alpha[j] = sum;
				}
			}
		}

		// Update gradient
		// gradient = Q alpha + c
		// ==>  grad += Q_i* d alpha_i + Q_j d alpha_j; Q_i = Q[i] (Q symmetric)
		var dai = alpha[i] - alpha_i;
		if ( Math.abs(dai) > 1e-8 ) {
			saxpy(dai, Q_i, grad);
			/*
			for (i=0; i< m; i++)
				grad[i] += dai * Q_i[i];
				*/
		}
		var daj = alpha[j] - alpha_j;
		if ( Math.abs(daj) > 1e-8 ) {
			saxpy(daj, Q_j, grad);
			/*for (i=0; i< m; i++)
				grad[i] += daj * Q_j[i];*/
		}

		iter++;
		if( iter % 1000 == 0)
			console.log("SVM iteration " + iter + ", stopping criterion = " + (gradmax - gradmin) );
	} while ( iter < 100000 && gradmax - gradmin > epsilon ) ;


	// Compute margin: // see SVR
	var Qalpha = sub ( grad, c ); // because gradient = Q alpha + c
	var sumAlphaYK_ij = mul(alpha, Qalpha );
	var marginvalue = 1.0 / (Math.sqrt(2 * sumAlphaYK_ij));

	var insideMargin = find( isEqual(alpha, C) );

	if ( !isFinite(marginvalue) || insideMargin.length == alpha.length)
		b = 0;
	else {
		// Compute b (from examples well on the margin boundary, with alpha_i about C/2:
		var nMarginSV = 0;
		var tol = 0.9;

		while ( nMarginSV < 2 && tol > 1e-6  ) {
			tol *= 0.5;
			nMarginSV = 0;
			b = 0;

			for(i=0;i < m ;i++) {
				if ( alpha[i] > tol*C && alpha[i] < (1.0 - tol) * C ) {

					var ayKi = dot(entrywisemulVector(alpha, y), kc.get_row( i ) ) ;

					b += y[i] - ayKi;	// b = 1/N sum_i (y_i - sum_j alpha_j y_j Kij)
					nMarginSV++;
				}
			}
		}
		if ( tol <= 1e-6 ) {
			b = 0;
			for(i=0;i < m ;i++) {
				if ( alpha[i] > tol*C ) {

					var ayKi = dot(entrywisemulVector(alpha, y), kc.get_row( i ) ) ;

					b += y[i] - ayKi;	// b = 1/N sum_i (y_i - sum_j alpha_j y_j Kij)
					nMarginSV++;
				}
			}
		}


		b /= nMarginSV;
	}

	/* Find support vectors	*/
	var tola = 1e-6;
	var nz = isGreater(alpha, tola);
	var SVindexes = find(nz); // list of indexes of SVs
	while ( SVindexes.length < 2  && tola > 2*EPS) {
		tola /= 10;
		nz = isGreater(alpha, tola);
		SVindexes = find(nz); // list of indexes of SVs
	}

	var SVlabels = get(y, SVindexes);
	var SV = get(X,SVindexes, []) ;
	switch ( type ( SV ) ) {
		case "spvector":
			SV = sparse(transpose(SV)); // matrix with 1 row
			break;
		case "vector":
			SV = transpose(SV);
			break;
	}

	alpha = entrywisemul(nz, alpha); // zeroing small alpha_i
	var dim_input = 1;
	if ( type(X) != "vector")
		dim_input = X.n; // set input dimension for checks during prediction

	// Compute w for linear classifiers
	var w;
	if ( this.kernel == "linear" ) {
		if(SVindexes.length > 1)
			w = transpose(mul( transpose( entrywisemul(get (alpha, SVindexes) , SVlabels) ), SV ));
		else
			w = vectorCopy(SV);
	}


	return {"SVindexes": SVindexes, "SVlabels": SVlabels, "SV": SV, "alpha": alpha, "b": b, "kernelcache": kc, "dim_input": dim_input, "w": w, "grad": grad};
}

SVM.prototype.trainMulticlass = function ( X, y, kc) {

	const Nclasses = this.labels.length;

	if ( this.onevsone ) {
		// Use the 1-against-1 decomposition
		const Nclassifiers = Math.round(Nclasses*(Nclasses-1)/2);

		var j,k,l;
		var ykl;
		var Xkl;
		var trainedparams;

		// Prepare arrays of parameters to store all binary classifiers parameters
		this.SVindexes = new Array(Nclassifiers);
		this.SVlabels = new Array(Nclassifiers);
		this.SV = new Array(Nclassifiers);
		this.alpha = new Array(Nclassifiers);
		this.b = new Array(Nclassifiers);
		this.w = new Array(Nclassifiers);

		// Prepare common kernel cache for all classes
		//this.kernelcache = kc;

		// Index lists
		var indexes = new Array(Nclasses);
		for ( k = 0; k < Nclasses; k++) {
			indexes[k] = new Array();
			for ( var i=0; i < y.length; i++) {
				if ( y[i] == this.numericlabels[k] )
					indexes[k].push(i);
			}
		}

		j = 0; // index of binary classifier
		for ( k = 0; k < Nclasses-1; k++) {
			for ( l = k+1; l < Nclasses; l++) {
				// For all pair of classes (k vs l), train a binary SVM

				Xkl = get(X, indexes[k].concat(indexes[l]), [] );
				ykl = ones(Xkl.length);
				set(ykl, range(indexes[k].length, Xkl.length), -1);
				trainedparams = this.trainBinary(Xkl, ykl);

				// and store the result in an array of parameters
				this.SVindexes[j] = trainedparams.SVindexes;  // list of indexes of SVs
				this.SVlabels[j] = trainedparams.SVlabels;
				this.SV[j] = trainedparams.SV;
				this.alpha[j] = trainedparams.alpha;
				this.b[j] = trainedparams.b;
				this.w[j] = trainedparams.w;

				if ( j == 0 ) {
					// for first classifier only:
					this.dim_input = trainedparams.dim_input; // set input dimension for checks during prediction
					if ( trainedparams.kernelcache ) {
						this.kernelpar = trainedparams.kernelcache.kernelpar;
						if ( this.dim_input > 1 )
							this.kernelFunc = trainedparams.kernelcache.kernelFunc;
						else
							this.kernelFunc = kernelFunction(this.kernel, this.kernelpar, "number"); // for scalar input
						this.sparseinput = (trainedparams.kernelcache.inputtype == "spvector");
					}
				}
				trainedparams.kernelcache = undefined;

				console.log("SVM #" + (j+1) + " trained for classes " + (k+1) + " vs " + (l+1) + " (out of " + Nclasses+ ")");
				j++;
			}
		}
	}
	else {
		// Use the 1-against-all decomposition

		var k;
		var yk;
		var trainedparams;

		// Prepare arrays of parameters to store all binary classifiers parameters
		this.SVindexes = new Array(Nclasses);
		this.SVlabels = new Array(Nclasses);
		this.SV = new Array(Nclasses);
		this.alpha = new Array(Nclasses);
		this.b = new Array(Nclasses);
		this.w = new Array(Nclasses);

		// Prepare common kernel cache for all classes
		this.kernelcache = kc;

		for ( k = 0; k < Nclasses; k++) {

			// For all classes, train a binary SVM

			yk = sub(mul(isEqual( y, this.numericlabels[k] ), 2) , 1 ); // binary y for classe k = 2*(y==k) - 1 => in {-1,+1}

			trainedparams = this.trainBinary(X, yk, this.kernelcache);	// provide precomputed kernel matrix

			// and store the result in an array of parameters
			this.SVindexes[k] = trainedparams.SVindexes;  // list of indexes of SVs
			this.SVlabels[k] = trainedparams.SVlabels;
			this.SV[k] = trainedparams.SV;
			this.alpha[k] = trainedparams.alpha;
			this.b[k] = trainedparams.b;
			this.w[k] = trainedparams.w;

			if ( k == 0 ) {
				// for first classifier only:
				this.kernelcache = trainedparams.kernelcache;	// save kernel cache for further use (like tuning parameters)
				this.dim_input = trainedparams.dim_input; // set input dimension for checks during prediction
				if ( this.kernelcache ) {
					this.kernelpar = this.kernelcache.kernelpar;
					if ( this.dim_input > 1 )
						this.kernelFunc = this.kernelcache.kernelFunc;
					else
						this.kernelFunc = kernelFunction(this.kernel, this.kernelpar, "number"); // for scalar input
					this.sparseinput = (this.kernelcache.inputtype == "spvector");
				}
			}

			console.log("SVM trained for class " + (k+1) +" / " + Nclasses);
		}
	}
}


SVM.prototype.predict = function ( x ) {
	const tx = type(x);
	if ( this.sparseinput ) {
		if ( tx != "spvector" && tx != "spmatrix")
			x = sparse(x);
	}
	else {
		if ( tx == "spvector" || tx == "spmatrix" )
			x = full(x);
	}

	if ( this.labels.length > 2)
		return this.predictMulticlass( x ) ;
	else
		return this.predictBinary( x );
}
SVM.prototype.predictBinary = function ( x ) {

	var scores = this.predictscore( x );
	if (typeof(scores) != "undefined")
		return this.recoverLabels( sign( scores ) );
	else
		return undefined;
}
SVM.prototype.predictMulticlass = function ( x ) {
	var scores = this.predictscore( x );
	const Q = this.labels.length;

	if (typeof(scores) != "undefined") {
		var tx = type(x);
		if ( (tx == "vector" && this.dim_input == 1) || tx == "matrix" || tx == "spmatrix" ) {
			// multiple predictions for multiple test data
			var i;
			var y = new Array(x.length );

			if ( this.onevsone ) {
				// one-vs-one: Majority vote
				var kpos, kneg;
				var votes = new Uint32Array(Q);
				var k = 0;
				for ( i = 0; i < x.length; i++) {
				 	for ( kpos = 0; kpos < Q; kpos++)
				 		votes[kpos] = 0;
					for ( kpos = 0; kpos < Q -1; kpos++) {
						for ( kneg = kpos+1; kneg < Q; kneg++) {
							if ( scores.val[k] >= 0 )
								votes[kpos]++;
							else
								votes[kneg]++;
							k++;
						}
					}

					y[i] = 0;
					for ( var c = 1; c < Q; c++)
						if ( votes[c] > votes[y[i]] )
							y[i] = c ;
				}
			}
			else {
				// one-vs-rest: argmax
				for ( i = 0; i < x.length; i++)
					y[i] = findmax ( scores.row(i) ) ;
			}
			return this.recoverLabels( y );
		}
		else {
			// single prediction

			if ( this.onevsone ) {
				// one-vs-one: Majority vote
				var kpos, kneg;
				var votes = new Uint16Array(Q);
				var k = 0;
				for ( kpos = 0; kpos < Q -1; kpos++) {
					for ( kneg = kpos+1; kneg < Q; kneg++) {
						if ( scores[k] >= 0 )
							votes[kpos]++;
						else
							votes[kneg]++;
						k++;
					}
				}
				var y = 0;
				for ( var c = 1; c < Q; c++)
					if ( votes[c] > votes[y[i]] )
						y[i] = c ;
				return this.recoverLabels( y );
			}
			else
				return this.recoverLabels( argmax( scores ) );
		}

	}
	else
		return undefined;
}

SVM.prototype.predictscore = function( x ) {
	// normalization
	var xn;
	if (typeof(this.normalization) != "string" )
		xn = normalize(x, this.normalization.mean, this.normalization.std);
	else
		xn = x;

	// prediction
	if ( this.labels.length > 2) {
		var k;
		var output = new Array(this.labels.length);
		for ( k = 0; k < this.alpha.length; k++)  {
			output[k] = this.predictscoreBinary( xn, this.alpha[k], this.SVindexes[k], this.SV[k], this.SVlabels[k], this.b[k], this.w[k] );
		}
		var tx = type(xn);
		if( tx == "matrix" || tx == "spmatrix" )
			return mat(output) ; // matrix of scores is of size Nsamples-by-Nclasses/Nclassifiers
		else
			return output; 		// vector of scores for all classes
	}
	else
		return this.predictscoreBinary( xn, this.alpha, this.SVindexes, this.SV, this.SVlabels, this.b, this.w );
}
SVM.prototype.predictscoreBinary = function( x , alpha, SVindexes, SV, SVlabels, b, w ) {

	var i;
	var j;
	var output;

	if ( this.single_x(x) ) {

		output = b;
		if ( this.kernel =="linear" && w)
			output += mul(x, w);
		else {
			for ( j=0; j < SVindexes.length; j++) {
				output += alpha[SVindexes[j]] * SVlabels[j] * this.kernelFunc(SV.row(j), x); // kernel ( SV.row(j), x, this.kernel, this.kernelpar);
			}
		}
		return output;
	}
	else {
		if (  this.kernel =="linear" && w)
			output = add( mul(x, w) , b);
		else {
			// Cache SVs
			var SVs = new Array(SVindexes.length);
			for ( j=0; j < SVindexes.length; j++)
				SVs[j] = SV.row(j);

			output = zeros(x.length);
			for ( i=0; i < x.length; i++) {
				output[i] = b;
				var xi = x.row(i);
				for ( j=0; j < SVindexes.length; j++) {
					output[i] += alpha[SVindexes[j]] * SVlabels[j] * this.kernelFunc(SVs[j], xi );
				}
			}
		}
		return output;
	}
}

function SVMlineartrain ( X, y, bias, C) {

	// Training binary LINEAR SVM with Coordinate descent in the dual
	//	as in "A Dual Coordinate Descent Method for Large-scale Linear SVM" by Hsieh et al., ICML 2008.
/*
m=loadMNIST("examples/")
svm=new Classifier(SVM)
svm.train(m.Xtrain[0:100,:], m.Ytrain[0:100])
*/

	var i;
	const m = X.length;
	var Xb;

	switch(type(X)) {
		case "spmatrix":
			if ( bias )
				Xb = sparse(mat([full(X), ones(m)])); // TODO use spmat()
			else
				Xb = X;

			var _dot = dotspVectorVector;
			var _saxpy = spsaxpy;

			break;
		case "matrix":
			if ( bias )
				Xb = mat([X, ones(m)]);
			else
				Xb = X;

			var _dot = dot;
			var _saxpy = saxpy;

			break;
		default:
			return undefined;
	}


	const d = size(Xb,2);

	var optimal = false;
	var alpha = zeros(m);
	var w = zeros(d);

	const Qii = sumMatrixCols( entrywisemulMatrix( Xb,Xb) );

	const maxX = norminf(Xb);

	var order;
	var G = 0.0;
	var PG = 0.0;
	var ii = 0;
	var k = 0;
	var u = 0.0;
	var alpha_i = 0.0;
	var Xbi;


	var iter = 0;
	// first iteration : G=PG=-1
	const Cinv = 1/C;
	for ( i=0; i < m; i++) {
		if ( Qii[i] < Cinv )
			alpha[i] = C;
		else
			alpha[i] =  1 / Qii[i] ;


		Xbi = Xb.row(i);
		u = alpha[i] * y[i] ;
		for ( k=0; k < d; k++)
			w[k] += u * Xbi[k];
	}

	iter = 1;
	do {
		// Outer iteration
		order = randperm(m); // random order of subproblems

		optimal = true;
		for (ii=0; ii < m; ii++) {
			i = order[ii];

			if ( Qii[i] > EPS ) {

				Xbi = Xb.row(i);

				alpha_i = alpha[i];

				G = y[i] * dot(Xbi, w) - 1;

				if ( alpha_i <= EPS ) {
					PG = Math.min(G, 0);
				}
				else if ( alpha_i >= C - EPS ) {
					PG = Math.max(G, 0);
				}
				else {
					PG = G;
				}

				if ( Math.abs(PG) > 1e-6 ) {
					optimal = false;
					alpha[i] = Math.min( Math.max( alpha_i - (G / Qii[i]), 0 ), C );

					// w = add(w, mul( (alpha[i] - alpha_i)*y[i] , Xb[i] ) );
					u = (alpha[i] - alpha_i)*y[i];
					if ( Math.abs(u) > 1e-6 / maxX ) {
						for ( k=0; k < d; k++)
							w[k] += u * Xbi[k];
					}
				}
			}
		}

		iter++;
		/*if ( Math.floor(iter / 1000) == iter / 1000 )
			console.log("SVM linear iteration = " + iter);*/
	} while ( iter < 10000 && !optimal ) ;

	var b;
	if ( bias ) {
		b = w[d-1];
		w = get ( w, range(d-1) );
	}
	else {
		b = 0;
	}

	// Compute SVs:
	var nz = isGreater(alpha, EPS);
	var SVindexes = find(nz); // list of indexes of SVs
	var SVlabels = get(y, SVindexes);
	var SV;// = get(X,SVindexes, []) ;
	alpha = entrywisemul(nz, alpha); // zeroing small alpha_i

	return {"SVindexes": SVindexes, "SVlabels": SVlabels, "SV": SV, "alpha": alpha, "b": b, "dim_input":  w.length, "w": w};
}

/*************************************************
		Multi-Class Support Vector Machine (MSVM)

	3 variants (MSVMtype) are implemented:
		- Crammer & Singer (CS)
		- Weston & Watkins (WW)
		- Lee, Lin and Wahba (LLW)

	Training by Frank-Wolfe algorithm
	as implemented in MSVMpack

**************************************************/
function MSVM ( params) {
	var that = new Classifier ( MSVM, params);
	return that;
}
MSVM.prototype.construct = function (params) {

	// Default parameters:
	this.MSVMtype = "CS";
	this.kernel = "linear";
	this.kernelpar = undefined;

	this.C = 1;

	this.optimAccuracy = 0.97;
	this.maxIter = 1000000;


	// Set parameters:
	var i;
	if ( params) {
		for (i in params)
			this[i] = params[i];
	}

	// Set defaults parameters depending on MSVM type
	if ( typeof(this.chunk_size) == "undefined") {
		if ( this.MSVMtype == "CS")
			this.chunk_size = 2;
		else
			this.chunk_size = 10;
	}

	// Parameter grid for automatic tuning:
	switch (this.kernel) {
		case "linear":
			this.parameterGrid = { "C" : [0.1, 1, 5, 10, 50] };
			break;
		case "gaussian":
		case "Gaussian":
		case "RBF":
		case "rbf":
			// use multiples powers of 1/sqrt(2) for sigma => efficient kernel updates by squaring
			this.parameterGrid = { "kernelpar": pow(1/Math.sqrt(2), range(-1,9)), "C" : [ 0.1, 1, 5, 10] };
			//this.parameterGrid = { "kernelpar": [0.1,0.2,0.5,1,2,5] , "C" : [ 0.1, 1, 5, 10, 50] };
			break;

		case "poly":
			this.parameterGrid = { "kernelpar": [3,5,7,9] , "C" : [ 0.1, 1, 5, 10] };
			break;
		case "polyh":
			this.parameterGrid = { "kernelpar": [3,5,7,9] , "C" : [ 0.1, 1, 5, 10] };
			break;
		default:
			this.parameterGrid = undefined;
			break;
	}
}

MSVM.prototype.tune = function ( X, labels, Xv, labelsv ) {
	// Tunes the SVM given a training set (X,labels) by cross-validation or using validation data

	/* Fast implementation uses the same kernel cache for all values of C
		and kernel updates when changing the kernelpar.

		We aslo use alpha seeding when increasing C.
	*/

	// Set the kernelpar range with the dimension
	if ( this.kernel == "rbf" ) {
		var saveKpGrid = zeros(this.parameterGrid.kernelpar.length);
		for ( var kp = 0; kp < this.parameterGrid.kernelpar.length ; kp ++) {
			saveKpGrid[kp] = this.parameterGrid.kernelpar[kp];
			if ( typeof(this.kernelpar) == "undefined")
				this.parameterGrid.kernelpar[kp] *= Math.sqrt( X.n );
		}
		if ( typeof(this.kernelpar) != "undefined")
			this.parameterGrid.kernelpar = mul(this.kernelpar, range(1.4,0.7,-0.1));
	}


	if ( arguments.length == 4 ) {
		// validation set (Xv, labelsv)

		if ( this.kernel == "linear" ) {
			// test all values of C
			var validationErrors = zeros(this.parameterGrid.C.length);
			var minValidError = Infinity;
			var bestC;

			for ( var c = 0; c < this.parameterGrid.C.length; c++) {
				this.C = this.parameterGrid.C[c];
				this.train(X,labels);
				validationErrors[c] = 1.0 - this.test(Xv,labelsv);
				if ( validationErrors[c] < minValidError ) {
					minValidError = validationErrors[c];
					bestC = this.C;
				}
			}
			this.C = bestC;

			this.train(mat([X,Xv]), mat([labels,labelsv]) ); // retrain with best values and all data
		}
		else {
			// grid of ( kernelpar, C) values
			var validationErrors = zeros(this.parameterGrid.kernelpar.length, this.parameterGrid.C.length);
			var minValidError = Infinity;

			var bestkernelpar;
			var bestC;

			var kc = new kernelCache( X , this.kernel, this.parameterGrid.kernelpar[0] );

			for ( var kp = 0; kp < this.parameterGrid.kernelpar.length; kp++) {
				this.kernelpar = this.parameterGrid.kernelpar[kp];
				if ( kp > 0 ) {
					kc.update( this.kernelpar );
				}
				for ( var c = 0; c < this.parameterGrid.C.length; c++) {
					this.C = this.parameterGrid.C[c];
					this.train(X,labels, kc);	// use the same kernel cache for all values of C
					validationErrors.set(kp,c, 1.0 - this.test(Xv,labelsv) );
					if ( validationErrors.get(kp,c) < minValidError ) {
						minValidError = validationErrors.get(kp,c);
						bestkernelpar = this.kernelpar;
						bestC = this.C;
					}
				}
			}
			this.kernelpar = bestkernelpar;
			this.C = bestC;
			this.train(mat([X,Xv], true), mat([labels,labelsv], true) ); // retrain with best values and all data
		}
	}
	else {

		// 5-fold Cross validation
		const nFolds = 5;

		const N = labels.length;
		const foldsize = Math.floor(N / nFolds);

		// Random permutation of the data set
		var perm = randperm(N);

		// Start CV
		if ( this.kernel == "linear" )
			var validationErrors = zeros(this.parameterGrid.C.length);
		else
			var validationErrors = zeros(this.parameterGrid.kernelpar.length,this.parameterGrid.C.length);


		var Xtr, Ytr, Xte, Yte;
		var i;
		var fold;
		for ( fold = 0; fold < nFolds - 1; fold++) {
			console.log("fold " + fold);
			Xte = get(X, get(perm, range(fold * foldsize, (fold+1)*foldsize)), []);
			Yte = get(labels, get(perm, range(fold * foldsize, (fold+1)*foldsize)) );

			var tridx = new Array();
			for (i=0; i < fold*foldsize; i++)
				tridx.push(perm[i]);
			for (i=(fold+1)*foldsize; i < N; i++)
				tridx.push(perm[i]);

			Xtr =  get(X, tridx, []);
			Ytr = get(labels, tridx);


			if ( this.kernel == "linear" ) {
				// test all values of C
				for ( var c = 0; c < this.parameterGrid.C.length; c++) {
					this.C = this.parameterGrid.C[c];
					console.log("training with C = " + this.C); // + " on " , tridx, Xtr, Ytr);
					this.train(Xtr,Ytr);
					validationErrors[c] += 1.0 - this.test(Xte,Yte) ;
				}
			}
			else {
				// grid of ( kernelpar, C) values

				var kc = new kernelCache( Xtr , this.kernel, this.parameterGrid.kernelpar[0] );

				for ( var kp = 0; kp < this.parameterGrid.kernelpar.length; kp++) {
					this.kernelpar = this.parameterGrid.kernelpar[kp];
					if ( kp > 0 ) {
						kc.update( this.kernelpar );
					}
					for ( var c = 0; c < this.parameterGrid.C.length; c++) {
						this.C = this.parameterGrid.C[c];
						console.log("Training with kp = " + this.kernelpar + " C = " + this.C);

						// alpha seeding: intialize alpha with optimal values for previous (smaller) C
						/* (does not help with values of C too different...
							if ( c == 0 )
								this.alphaseeding.use = false;
							else {
								this.alphaseeding.use = true;
								this.alphaseeding.alpha = this.alpha;
							}
						*/
						this.train(Xtr,Ytr, kc);	// use the same kernel cache for all values of C
						validationErrors.val[kp * this.parameterGrid.C.length + c] += 1.0 - this.test(Xte,Yte) ;
					}
				}
			}
		}
		console.log("fold " + fold);
		// last fold:
		Xtr = get(X, get(perm, range(0, fold * foldsize)), []);
		Ytr = get(labels, get(perm, range(0, fold * foldsize ) ) );
		Xte = get(X, get(perm, range(fold * foldsize, N)), []);
		Yte = get(labels, get(perm, range(fold * foldsize, N)) );

		if ( this.kernel == "linear" ) {
			// test all values of C
			for ( var c = 0; c < this.parameterGrid.C.length; c++) {
				this.C = this.parameterGrid.C[c];
				console.log("training with C = " + this.C);
				this.train(Xtr,Ytr);
				validationErrors[c] += 1.0 - this.test(Xte,Yte) ;
			}
		}
		else {
			// grid of ( kernelpar, C) values

			var kc = new kernelCache( Xtr , this.kernel, this.parameterGrid.kernelpar[0] );

			for ( var kp = 0; kp < this.parameterGrid.kernelpar.length; kp++) {
				this.kernelpar = this.parameterGrid.kernelpar[kp];
				if ( kp > 0 ) {
					kc.update( this.kernelpar );
				}
				for ( var c = 0; c < this.parameterGrid.C.length; c++) {
					this.C = this.parameterGrid.C[c];
					console.log("Training with kp = " + this.kernelpar + " C = " + this.C);
					// alpha seeding: intialize alpha with optimal values for previous (smaller) C
					/*
					if ( c == 0 )
						this.alphaseeding.use = false;
					else {
						this.alphaseeding.use = true;
						this.alphaseeding.alpha = this.alpha;
					}*/

					this.train(Xtr,Ytr, kc);	// use the same kernel cache for all values of C
					validationErrors.val[kp * this.parameterGrid.C.length + c] += 1.0 - this.test(Xte,Yte) ;
				}
			}
		}

		// Compute Kfold errors and find best parameters
		var minValidError = Infinity;
		var bestC;
		var bestkernelpar;

		if ( this.kernel == "linear" ) {
			for ( var c = 0; c < this.parameterGrid.C.length; c++) {
				validationErrors[c] /= nFolds;
				if ( validationErrors[c] < minValidError ) {
					minValidError = validationErrors[c];
					bestC = this.parameterGrid.C[c];
				}
			}
			this.C = bestC;
		}
		else {
			// grid of ( kernelpar, C) values
			for ( var kp = 0; kp < this.parameterGrid.kernelpar.length; kp++) {
				for ( var c = 0; c < this.parameterGrid.C.length; c++) {
					validationErrors.val[kp * this.parameterGrid.C.length + c] /= nFolds;
					if(validationErrors.val[kp * this.parameterGrid.C.length + c] < minValidError ) {
						minValidError = validationErrors.val[kp * this.parameterGrid.C.length + c];
						bestC = this.parameterGrid.C[c];
						bestkernelpar = this.parameterGrid.kernelpar[kp];
					}
				}
			}
			this.C = bestC;
			this.kernelpar = bestkernelpar;
		}

		//this.alphaseeding.use = false;

		// Retrain on all data
		this.train(X, labels);
	}

	// Restore the dimension-free kernelpar range
	if ( this.kernel == "rbf" ) {
		for ( var kp = 0; kp < this.parameterGrid.kernelpar.length ; kp ++) {
			this.parameterGrid.kernelpar[kp] = saveKpGrid[kp];
		}
	}

	this.validationError = minValidError;
	return {error: minValidError, validationErrors: validationErrors};
}
MSVM.prototype.train = function (X, labels) {
	// Training function

	// should start by checking labels (and converting them to suitable numerical values):
	var y = this.checkLabels( labels ) ;

	// Check multi-class case
	if ( this.labels.length <= 2 ) {
		error( "The data set should contain more than 2 classes for M-SVMs." );
	}

	const C = this.C;

	var alpha;

	var chunk;
	var K;
	var i;
	var k;
	var j;
	var l;

	var gradient;
	var gradient_update_ik;
	var H_alpha;
	var delta;
	var theta;
	var y_i;
	var y_j;
	var partial;
	var alpha_update;
	var lp_rhs;

	// Initialization
	const Q = this.labels.length;
	const N = X.length;
	if ( this.chunk_size > N ) {
		this.chunk_size = N;
	}
	const chunk_size = this.chunk_size;
	var chunk_vars;	// variables indexes in alpha

	switch ( this.MSVMtype ) {

		case "CS":
			alpha = zeros(N*Q);	// vectorized
			gradient = zeros(N*Q);
			for ( i=0; i < N; i++ ) {
				alpha[i*Q + y[i]] = C;
				gradient[i*Q + y[i]] = 1;
			}
			H_alpha = zeros(N*Q);
			break;
		case "LLW":
			alpha = zeros(N*Q);	// vectorized
			gradient = mulScalarVector(-1.0/(Q-1.0), ones(N*Q));
			for ( i=0; i < N; i++ )
				gradient[i*Q + y[i]] = 0;
			H_alpha = zeros(N*Q);

			lp_rhs = zeros(Q-1);
			break;
		case "WW":
		default:
			alpha = zeros(N*Q);	// vectorized
			gradient = minus(ones(N*Q));
			for ( i=0; i < N; i++ )
				gradient[i*Q + y[i]] = 0;
			H_alpha = zeros(N*Q);

			lp_rhs = zeros(Q-1);
			break;
	}

	// create a new kernel cache
	if ( typeof(kc) == "undefined" ) {
		// create a new kernel cache if it is not provided
		var kc = new kernelCache( X , this.kernel, this.kernelpar );
	}
	K = new Array(); // to store kernel rows

	// Create function that updates the gradient
	var update_gradient;
	switch ( this.MSVMtype ) {
	case "LLW":
		update_gradient = function ( chunk, alpha_update ) {
			var i,y_i,k,gradient_update_ik,j,y_j,partial,l,s,e;
			for(i=0; i < N; i++) {
				y_i = y[i];

				for(k=0; k< Q; k++) {
					if(k != y_i) {
						gradient_update_ik = 0.0;
						for(j=0; j< chunk_size; j++) {
							y_j = y[chunk[j]];

							//partial = - sumVector( getSubVector(alpha_update, range(j*Q, (j+1)*Q) ) ) / Q;
							partial = 0;
							s = j*Q;
							e = s + Q;
							for ( l=s; l < e; l++)
								partial -= alpha_update[l];
							partial /= Q;

							partial +=  alpha_update[j*Q + k];

							// Use the symmetry of K: Kglobal[i][chunk[j]] = Kglobal(chunk[j], i) = K[j][i]
							gradient_update_ik += partial * K[j][i];
						}
			  			l = i*Q+k;
						gradient[l] += gradient_update_ik;
						H_alpha[l] += gradient_update_ik;
			  		}
				}
			}
		};
		break;
	case "CS":
	case "WW":
	default:
		update_gradient = function ( chunk, alpha_update ) {
			var i,y_i,k,gradient_update_ik,j,y_j,partial,l,s,e;
			for(i=0; i < N; i++) {
				y_i = y[i];

				for(k=0; k< Q; k++) {
					if(k != y_i) {
						gradient_update_ik = 0.0;
						for(j=0; j< chunk_size; j++) {
							y_j = y[chunk[j]];

							partial = 0.0;
							s = j*Q;
							e = s + Q;

							//if(y_j == y_i )
								//partial += sumVector( getSubVector(alpha_update, range(j*Q, (j+1)*Q) ) );
							if(y_j == y_i ) {
								for ( l=s; l < e; l++)
									partial += alpha_update[l];
							}
							//if(y_j == k )
								//partial -= sumVector( getSubVector(alpha_update, range(j*Q, (j+1)*Q) ) );

							if(y_j == k ) {
								for ( l=s; l < e; l++)
									partial -= alpha_update[l];
							}

							partial += alpha_update[s+k] - alpha_update[s + y_i] ;
							// Use the symmetry of K: Kglobal[i][chunk[j]] = Kglobal(chunk[j], i) = K[j][i]
							gradient_update_ik += partial * K[j][i];
						}
			  			l = i*Q+k;
						gradient[l] += gradient_update_ik;
						H_alpha[l] += gradient_update_ik;
			  		}
				}
			}
		};
		break;
	}

	// Main loop
	var info = {};
	info.primal = Infinity;
	var ratio = 0;
	var iter = 0;
	var ratio_10k = -1;
	var ratio_stable_10k = false;

	var infoStep ;
	if ( this.MSVMtype == "CS")
		infoStep = Math.floor(1000/chunk_size);
	else
		infoStep = Math.floor(10000/chunk_size);

	if ( infoStep > 1000 )
		infoStep = 1000;
	if ( infoStep < 100 )
		infoStep = 100;

	tic();

	do {
		// Working set selection: chunk = data indexes
		if ( this.MSVMtype == "CS" && iter > 0.2*N/chunk_size && (iter % 100 < 80) ) {
			chunk = MSVM_CS_workingset_selection(chunk_size, N, Q, alpha, gradient);
		}
		else {
			chunk = MSVMselectChunk(chunk_size,N) ; // random selection for all others
		}

		chunk_vars = [];
		for ( i=0; i < chunk_size; i++) {
			for ( k=0; k< Q; k++)
				chunk_vars.push(chunk[i]*Q + k);
		}

		// Compute kernel submatrix
		for ( i=0; i < chunk_size; i++) {
			K[i] = kc.get_row( chunk[i] ) ;
		}

		// solve LP for Frank-Wolfe step
		switch( this.MSVMtype ) {
			case "CS":
				delta = MSVM_CS_lp(Q,C, y, alpha, gradient, chunk ,chunk_vars) ;
				break;
			case "LLW":
				delta = MSVM_LLW_lp(Q,C, y, alpha, gradient, chunk ,chunk_vars, lp_rhs) ;
				break;
			case "WW":
			default:
				delta = MSVM_WW_lp(Q,C, y, alpha, gradient, chunk ,chunk_vars, lp_rhs) ;
				break;
		}

		if ( typeof(delta) != "undefined" && norm0(delta) > 0 ) {

			// Step length
			switch( this.MSVMtype ) {
				case "LLW":
					theta = MSVM_LLW_steplength(Q,chunk, chunk_size, chunk_vars, y, delta, K, gradient);
					break;
				case "CS":
				case "WW":
				default:
					theta = MSVM_steplength(Q,chunk, chunk_size, chunk_vars, y, delta, K, gradient);
					break;
			}

			if ( theta > 1e-10 ) {
				// Take the step
				alpha_update = mulScalarVector( -theta, delta );
				//set ( alpha, chunk_vars, add( getSubVector(alpha, chunk_vars), alpha_update) );
				for(k=0; k<chunk_vars.length; k++) {
					alpha[chunk_vars[k]] += alpha_update[k];
				}

				// Update RHS of constraints in LP (dense format)
				switch( this.MSVMtype ) {
				case "CS":
					break;
				case "LLW":
					for(i=0; i<chunk_size; i++) {
						for(k=0; k<Q-1; k++) {
							for(l=i*Q; l<(i+1)*Q; l++)
								 lp_rhs[k] += alpha_update[l];
							lp_rhs[k] -= Q * alpha_update[i*Q + k];
						}
					}
					break;
				case "WW":
				default:
					for(i=0; i<chunk_size; i++) {
						for(k=0; k<Q-1; k++) {
							for(l=0; l< Q; l++) {
								if((y[chunk[i]] == k) && (l != k))
									lp_rhs[k] += alpha_update[i*Q + l];
								else if((y[chunk[i]] != k) && (l == k))
									lp_rhs[k] -= alpha_update[i*Q + l];
							}
						}
					}
					break;
				}

				// Update gradient
				update_gradient( chunk, alpha_update ) ;

				//	console.log(H_alpha, alpha, gradient, alpha_update);
			}
		}

		if ( iter % infoStep == 0 ) {
			// Evaluate optimization accuracy
			switch( this.MSVMtype) {
				case "CS":
					info = MSVM_CS_evaloptim(Q,C, y, alpha, gradient, H_alpha, info);
					break;
				case "LLW":
					info = MSVM_LLW_evaloptim(Q,C, y, alpha, gradient, H_alpha, info);
					break;
				case "WW":
				default:
					info = MSVM_WW_evaloptim(Q,C, y, alpha, gradient, H_alpha, info);
					break;
			}

			if ( isFinite(info.primal) )
				ratio = info.dual / info.primal;
			else
				ratio = 0;

			if ( iter % 10000 == 0 ) {
				ratio_stable_10k = (Math.abs(ratio - ratio_10k) < 1e-3 );
				ratio_10k = ratio;
			}
			//console.log("iter " + iter + " Remp=" + info.trainingError.toFixed(4) + " ratio=" + info.dual.toFixed(4) + "/" + info.primal.toFixed(4) + "=" + (100*ratio).toFixed(4) + " %");
			console.log("iter " + iter + ": time=" + toc() + " Remp=" + info.trainingError.toFixed(4) + " ratio= " + (100*ratio).toFixed(4) + " %");
		}


		iter++;
	} while (ratio < this.optimAccuracy && iter < this.maxIter && !ratio_stable_10k );

	// Set model parameters
	this.alpha = zeros(Q,N);
	var isSV = zeros(N);
	for ( i=0; i<N;i++) {
		for ( k=0; k < Q; k++) {
			if ( !isZero( alpha[i*Q+k] ) ) {
				this.alpha.val[k*N+i] = alpha[i*Q+k];

				if (this.MSVMtype != "CS" || k != y[i])
					isSV[i] = 1;
			}
		}
	}
	this.SVindexes = find(isNotEqual(isSV, 0) );
	this.SV = get(X,this.SVindexes, []);
	this.SVlabels = get(y,this.SVindexes);

	if ( this.MSVMtype == "CS" )
		this.b = zeros(Q);
	else
		this.b = info.b;

	this.dim_input = size(X,2);

	this.kernelpar = kc.kernelpar;
	if ( this.dim_input > 1 )
		this.kernelFunc = kc.kernelFunc;
	else
		this.kernelFunc = kernelFunction(this.kernel, this.kernelpar, "number"); // for scalar input kernelcache uses 1D-vectors
	this.sparseinput = (kc.inputtype == "spvector");


	/* and return training error rate:
	return info.trainingError;*/
	return this.info();
}
// MSVM tools
function MSVMselectChunk ( chunk_size, N ) {
	var r = randperm(N);
	return get(r, range(chunk_size) );
}
function MSVM_CS_workingset_selection (chunk_size, N, Q, alpha, gradient) {
	/*

	select points with maximal violation of the KKT condition
	as measured by

	psi_i = max_{k, alpha_ik>0} gradient_ik   -  min_k gradient_ik

	*/
	var i;
	var j;
	var l;
	var psi = zeros(N);
	var chunk = new Array();
	var alpha_i_pos;
	var grad_i;

	for ( i=0; i < N; i++) {
		/*
		alpha_i_pos = find( isGreater( getSubVector(alpha, range(i*Q, (i+1)*Q)) , 0.001) );
		grad_i = getSubVector(gradient, range(i*Q, (i+1)*Q));
		if ( alpha_i_pos.length > 0 )
			psi[i] = max(getSubVector(grad_i, alpha_i_pos)) - min(grad_i);
		else
			return undefined; // should not happen due to sum_k alpha_ik = C
		*/
		var maxg = -Infinity;
		var ming = +Infinity;
		for (l=i*Q; l < (i+1)*Q; l++) {
			if ( alpha[l] > 0.001 && gradient[l] > maxg)
				maxg = gradient[l];
			if ( gradient[l] < ming )
				ming = gradient[l];
		}
		psi[i] = maxg - ming;

		// chunk= list of data indexes with ordered psi values
		j = 0;
		while ( j < chunk.length && psi[i] < psi[chunk[j]] ) {
			j++;
		}
		if ( j < chunk.length ) {
			chunk.splice(j,0,i );
			while ( chunk.length > chunk_size )
				chunk.pop();
		}
		else if ( j < chunk_size ) {
			chunk.push(i);
		}
	}
	/*if ( psi[chunk[0] ] < 0.01 )
		console.log("psimax: " + psi[chunk[0]]);*/
	return chunk;
}

function MSVM_WW_lp (Q,C, y, alpha, gradient, chunk,chunk_vars, lp_rhs) {

	const chunk_size = chunk.length;

	var rhs;
	var lp_A;
	var col;
	var lp_sol;
	var lp_sol_table;
	var lp_sol_table_inv;

	const lp_nCols = (Q-1)*chunk_size;
	var lp_cost = zeros(lp_nCols);
	var lp_low = zeros(lp_nCols);
	var lp_up = mulScalarVector(C,  ones(lp_nCols));

	var i;
	var k;
	var l;
	var y_i;

	// objective function
	col = 0;
	lp_sol_table_inv = zeros(chunk_size, Q);
	lp_sol_table = zeros(lp_nCols,2);
	for(i=0; i<chunk_size; i++) {
		y_i = y[chunk[i]];
		for(k=0; k< Q; k++) {
		    if(k != y_i) {
      			lp_cost[col] = gradient[chunk[i]*Q + k];
				lp_sol_table.val[col*2] = i;	// keep a table of correspondance between
				lp_sol_table.val[col*2+1] = k;	// LP vector of variables and lp_sol matrix
				lp_sol_table_inv.val[i*Q+k] = col; // lp_sol[i][k] = the 'lp_solve_table_inv[i][k]'-th variable for LPSOLVE
				col++;
    		}
    	}
  	}
  		// Make RHS of constraints
		// -- updates to cache->rhs are made in compute_new_alpha()
		//    to keep track of rhs
		//    we only need to remove the contribution of the examples in the chunk
	rhs = vectorCopy( lp_rhs );

	for(k=0; k < Q-1; k++) {
		for(i=0; i<chunk_size; i++) {
			y_i = y[chunk[i]];
			for(l=0; l< Q; l++){
				if((y_i == k) && (l != k))
					rhs[k] -= alpha[chunk[i]*Q + l];
				else if((y_i != k) && (l == k))
					rhs[k] += alpha[chunk[i]*Q + l];
			}
		}
	}
	  	// Make constraints
	lp_A = zeros(Q-1, lp_nCols );
	for(k=0; k < Q-1; k++) {

		for(i=0; i< chunk_size; i++) {
		    y_i = y[chunk[i]];

		    if(y_i == k) {
		    	for(l=0; l< Q; l++) {
					if(l != k)
						lp_A.val[k*lp_nCols + lp_sol_table_inv.val[i*Q+l]] = -1.0;
	  			}
			}
			else
			  lp_A.val[k*lp_nCols + lp_sol_table_inv.val[i*Q+k]] = +1.0;
    	}
  	}

		// solve
	lp_sol = lp( lp_cost, [], [], lp_A, rhs, lp_low, lp_up ) ;

	if (typeof(lp_sol) != "string") {
			// get direction from lp solution
		var direction = zeros(chunk_size * Q);
		for ( col=0; col < lp_nCols; col++) {
			if ( lp_sol[col] < -EPS || lp_sol[col] > C + EPS )
				return undefined; // infeasible

			if ( lp_sol[col] > EPS )
				direction[lp_sol_table.val[col*2] * Q + lp_sol_table.val[col*2+1]] = lp_sol[col];
			else if ( lp_sol[col] > C - EPS )
				direction[lp_sol_table.val[col*2] * Q + lp_sol_table.val[col*2+1]] = C;

		}

		var delta = subVectors ( getSubVector(alpha, chunk_vars) , direction );

		return delta;
	}
	else {
		return undefined;
	}
}
function MSVM_LLW_lp (Q,C, y, alpha, gradient, chunk,chunk_vars, lp_rhs) {

	const chunk_size = chunk.length;

	var rhs;
	var lp_A;
	var col;
	var lp_sol;
	var lp_sol_table;
	var lp_sol_table_inv;

	const lp_nCols = Q*chunk_size;
	const lp_nRows = (Q-1);
	var lp_cost = zeros(lp_nCols);
	var lp_low = zeros(lp_nCols);
	var lp_up = mulScalarVector(C,  ones(lp_nCols));

	var i;
	var k;
	var l;
	var y_i;
	var alpha_i;

	// objective function
	col = 0;
	lp_sol_table_inv = zeros(chunk_size, Q);
	lp_sol_table = zeros(lp_nCols,2);
	for(i=0; i<chunk_size; i++) {
		y_i = y[chunk[i]];
		for(k=0; k< Q; k++) {
  			lp_cost[col] = gradient[chunk[i]*Q + k];
			lp_sol_table.val[col*2] = i;	// keep a table of correspondance between
			lp_sol_table.val[col*2+1] = k;	// LP vector of variables and lp_sol matrix
			lp_sol_table_inv.val[i*Q+k] = col; // lp_sol[i][k] = the 'lp_solve_table_inv[i][k]'-th variable for LPSOLVE
			col++;
    	}
  	}
  		// Make RHS of constraints
		// -- updates to cache->rhs are made in compute_new_alpha()
		//    to keep track of rhs
		//    we only need to remove the contribution of the examples in the chunk
	rhs = vectorCopy( lp_rhs );

	for(k=0; k < Q-1; k++) {
		for(i=0; i<chunk_size; i++) {
			y_i = y[chunk[i]];
			alpha_i = alpha.subarray(chunk[i]*Q, (chunk[i]+1)*Q);

			rhs[k] -= sumVector(alpha_i);
			rhs[k] += Q * alpha_i[k];
		}
	}
	  	// Make constraints
	lp_A = zeros(lp_nRows, lp_nCols );
	for(k=0; k < lp_nRows; k++) {

		for(i=0; i< chunk_size; i++) {
		    y_i = y[chunk[i]];

	    	for(l=0; l< Q; l++) {
				if(l != y_i) {
					if ( l == k )
						lp_A.val[k*lp_nCols + lp_sol_table_inv.val[i*Q+l]] = Q - 1.0 ;
					else
						lp_A.val[k*lp_nCols + lp_sol_table_inv.val[i*Q+l]] = -1.0 ;
				}
			}
    	}
  	}

		// solve
	lp_sol = lp( lp_cost, [], [], lp_A, rhs, lp_low, lp_up ) ;

	if (typeof(lp_sol) != "string") {
			// get direction from lp solution
		var direction = zeros(chunk_size * Q);
		for ( col=0; col < lp_nCols; col++) {
			if ( lp_sol[col] < -EPS || lp_sol[col] > C + EPS )
				return undefined; // infeasible

			if ( lp_sol[col] > EPS )
				direction[lp_sol_table.val[col*2] * Q + lp_sol_table.val[col*2+1]] = lp_sol[col];
			else if ( lp_sol[col] > C - EPS )
				direction[lp_sol_table.val[col*2] * Q + lp_sol_table.val[col*2+1]] = C;

		}

		var delta = subVectors ( getSubVector(alpha, chunk_vars) , direction );

		return delta;
	}
	else {
		return undefined;
	}
}

function MSVM_CS_lp (Q,C, y, alpha, gradient, chunk,chunk_vars) {

	const chunk_size = chunk.length;

	var col;
	var lp_sol;
	var lp_sol_table;
	var lp_sol_table_inv;

	const lp_nCols = Q*chunk_size;
	const lp_nRows = chunk_size;
	var lp_cost = zeros(lp_nCols);
	var lp_low = zeros(lp_nCols);
//	var lp_up = mul(C,  ones(lp_nCols));// implied by equality constraints, but set anyway...
	var rhs;
	var lp_A;

	var i;
	var k;
	var l;
	var y_i;

	// objective function
	col = 0;
	lp_sol_table_inv = zeros(chunk_size, Q);
	lp_sol_table = zeros(lp_nCols,2);
	for(i=0; i<chunk_size; i++) {
		for(k=0; k< Q; k++) {
  			lp_cost[col] = gradient[chunk[i]*Q + k];
			lp_sol_table.val[col*2] = i;	// keep a table of correspondance between
			lp_sol_table.val[col*2+1] = k;	// LP vector of variables and lp_sol matrix
			lp_sol_table_inv.val[i*Q+k] = col; // lp_sol[i][k] = the 'lp_solve_table_inv[i][k]'-th variable for LPSOLVE
			col++;
    	}
  	}

  		// Make constraints : forall i,  sum_k alpha_ik = C_yi
	rhs = mulScalarVector(C, ones(chunk_size) );
	lp_A = zeros(lp_nRows, lp_nCols);
	for(i=0; i<chunk_size; i++) {
		//set(lp_A, i, range(i*Q, (i+1)*Q), ones(Q) );
		for ( l = i*Q; l < (i+1)*Q; l++)
			lp_A.val[lp_nCols*i + l] = 1;
	}

		// solve
	lp_sol = lp( lp_cost, [], [], lp_A, rhs, lp_low ) ;

	if (typeof(lp_sol) != "string") {
			// get direction from lp solution
		var direction = zeros(chunk_size * Q);
		for ( col=0; col < lp_nCols; col++) {
			if ( lp_sol[col] < -EPS || lp_sol[col] > C + EPS )
				return undefined; // infeasible

			if ( lp_sol[col] > EPS )
				direction[lp_sol_table.val[col*2] * Q + lp_sol_table.val[col*2+1]] = lp_sol[col];
			else if ( lp_sol[col] > C - EPS )
				direction[lp_sol_table.val[col*2] * Q + lp_sol_table.val[col*2+1]] = C;
		}

		var delta = subVectors ( getSubVector(alpha, chunk_vars) , direction );

		return delta;
	}
	else {
		return undefined;
	}
}

function MSVM_steplength (Q,chunk, chunk_size, chunk_vars, y, delta, K, gradient){
	var Hdelta = zeros(Q*chunk_size);
	var i;
	var j;
	var k;
	var y_i;
	var partial;
	var l;
	var s;
	var e;

	for ( i=0;i<chunk_size; i++) {
		y_i = y[chunk[i]];
		for ( k=0; k < Q; k++) {
			 if(k != y_i ) {
	  			for(j=0; j<chunk_size; j++) {
					partial = 0.0;
					s = j*Q;
					e = s + Q;

					if( y[chunk[j]] == y_i ) {
						//partial += sumVector( getSubVector(delta, range(j*Q, (j+1)*Q) ) );
						for ( l=s; l < e; l++)
							partial += delta[l];
					}
					if( y[chunk[j]] == k ) {
						//partial -=  sumVector( getSubVector(delta, range(j*Q, (j+1)*Q) ) );
						for ( l=s; l < e; l++)
							partial -= delta[l];
					}

					partial += delta[s + k] - delta[s + y_i];
					Hdelta[i*Q + k] += partial * K[i][chunk[j]];
				}
			}
		}
	}

  	var den = dot(delta, Hdelta);
  	var theta;
	if ( den < EPS )
		theta = 0;
	else  {
		theta = dot(getSubVector ( gradient, chunk_vars) , delta ) / den;

		if (theta > 1 )
			theta = 1;
	}
	return theta;
}
function MSVM_LLW_steplength (Q,chunk, chunk_size, chunk_vars, y, delta, K, gradient){
	var Hdelta = zeros(Q*chunk_size);
	var i;
	var j;
	var k;
	var y_i;
	var partial;
	var l,s,e;

	for ( i=0;i<chunk_size; i++) {
		y_i = y[chunk[i]];
		for ( k=0; k < Q; k++) {
			 if(k != y_i ) {
	  			for(j=0; j<chunk_size; j++) {

					//partial = -sumVector( getSubVector(delta, range(j*Q, (j+1)*Q) ) ) / Q;
					partial = 0.0;
					s = j*Q;
					e = s + Q;
					for ( l=s; l < e; l++)
							partial -= delta[l];
					partial /= Q;

					partial += delta[s+k];

					Hdelta[i*Q + k] += partial * K[i][ chunk[j] ];
				}
			}
		}
	}

  	var den = dot(delta, Hdelta);
  	var theta;
	if ( den < EPS )
		theta = 0;
	else  {
		theta = dot(getSubVector ( gradient, chunk_vars) , delta ) / den;

		if (theta > 1 )
			theta = 1;
	}
	return theta;
}
function MSVM_WW_evaloptim (Q,C, y, alpha, gradient, H_alpha, info) {
	// Evaluate accuracy of the optimization while training an MSVM

	var i;
	const N = y.length;

	// Estimate b
	var b = MSVM_WW_estimate_b(Q,C,y,alpha,gradient);

	// Compute R_emp
	var R_emp = 0;
	var trainingErrors = 0;
	var delta;
	for ( i=0; i < N; i++) {
		delta = addVectors(gradient.subarray(i*Q, (i+1)*Q), subScalarVector(b[y[i]], b) );
		delta[y[i]] = 0;

		R_emp -= sumVector( minVectorScalar(delta, 0) ) ;

		if ( minVector(delta) <= -1 )
			trainingErrors++;
	}
	R_emp *= C;

	// Compute dual objective
	var alpha_H_alpha = dot(alpha, H_alpha) ;	// or H_alpha = add(gradient,1);

	var dual = -0.5 * alpha_H_alpha + sumVector(alpha);

	// Compute primal objective
	var primal = 0.5 * alpha_H_alpha + R_emp;

	if ( primal > info.primal )
		primal = info.primal;

	return {primal: primal, dual: dual, Remp: R_emp, trainingError: trainingErrors / N, b: b};
}

function MSVM_WW_estimate_b(Q,C,y,alpha, gradient) {

	var i;
	var k;
	var l;

	const N = y.length;

	var delta_b = zeros(Q* Q);
	var nb_margin_vect = zeros(Q* Q);
	var b = zeros(Q);

	for(i=0; i<N; i++) {
		for(k=0; k<Q; k++) {
			if( alpha[i*Q+k] < C - 0.001*C && alpha[i*Q+k] > 0.001*C) {
				// margin boundary SV for class k
				delta_b[y[i]*Q+k] -= gradient[i*Q+k];
				nb_margin_vect[y[i] * Q + k] ++;
			}
		}
	}

	for(k=0; k< Q; k++) {
		for(l=0; l < Q; l++) {
	    	if(k != l) {
			    if( nb_margin_vect[k*Q + l] > 0 ) {
					delta_b[k*Q + l] /= nb_margin_vect[k * Q + l];
				}
			}
		}
	}

	for(k=1; k< Q; k++) {
		var nb_k = nb_margin_vect[k * Q] + nb_margin_vect[k];
		if(nb_k > 0) {
			b[k] = (nb_margin_vect[k*Q] * delta_b[k*Q] - nb_margin_vect[k] * delta_b[k]) / nb_k;
	    }
	}

	// make sum(b) = 0;
	b = subVectorScalar(b, sumVector(b) / Q );

	return b;
}

function MSVM_LLW_evaloptim (Q,C, y, alpha, gradient, H_alpha, info) {
	// Evaluate accuracy of the optimization while training an MSVM
	var i;
	const N = y.length;

	// Estimate b
	var b = MSVM_LLW_estimate_b(Q,C,y,alpha,gradient);

	// Compute R_emp
	var R_emp = 0;
	var trainingErrors = 0;
	var output;
	var xi_i;

	for ( i=0; i < N; i++) {
		output = subVectors(b, H_alpha.subarray(i*Q, (i+1)*Q) )
		output[y[i]] = 0;
		output[y[i]] = -sumVector(output);

		xi_i = subVectors(b,  gradient.subarray(i*Q, (i+1)*Q) )
		xi_i[y[i]] = 0;

		R_emp += sumVector( maxVectorScalar ( xi_i, 0) );

		if ( argmax(output) != y[i] )
			trainingErrors++;
	}
	R_emp *= C;

	// Compute dual objective
	var alpha_H_alpha = dot(alpha, H_alpha) ;

	var dual = -0.5 * alpha_H_alpha + (sumVector(alpha) / (Q-1));

	// Compute primal objective
	var primal = 0.5 * alpha_H_alpha + R_emp;

	if ( primal > info.primal )
		primal = info.primal;

	return {primal: primal, dual: dual, Remp: R_emp, trainingError: trainingErrors / N, b: b};
}
function MSVM_LLW_estimate_b(Q,C,y,alpha, gradient) {

	var i;
	var k;
	var l;

	const N = y.length;

	var nb_margin_vect = zeros(Q);
	var b = zeros(Q);

	if ( maxVector(alpha) <= EPS )
		return b;

	for(i=0; i<N; i++) {
		for(k=0; k<Q; k++) {
			if( k != y[i] && alpha[i*Q+k] < C - 0.001*C && alpha[i*Q+k] > 0.001*C) {
				// margin boundary SV for class k
				b[k] += gradient[i*Q+k];
				nb_margin_vect[k] ++;
			}
		}
	}

	for(k=0; k< Q; k++) {
		if( nb_margin_vect[k] > 0 ) {
			b[k] /= nb_margin_vect[k];
		}
	}

	// make sum(b) = 0;
	b = subVectorScalar(b, sumVector(b) / Q );

	return b;
}

function MSVM_CS_evaloptim (Q,C, y, alpha, gradient, H_alpha, info) {
	// Evaluate accuracy of the optimization while training an MSVM
	var i;
	const N = y.length;

	// Compute R_emp
	var R_emp = 0;
	var trainingErrors = 0;

	var xi = maxVectorScalar( subScalarVector(1, H_alpha) , 0 );

	var ximax ;
	var sum_alpha_iyi = 0;

	for ( i=0; i < N; i++) {
		xi[i*Q + y[i]] = 0;

		ximax = maxVector( xi.subarray( i*Q, (i+1)*Q) );

		R_emp += ximax;

		if ( ximax > 1 )
			trainingErrors++;

		sum_alpha_iyi += alpha[i*Q + y[i] ];
	}
	R_emp *= C;

	// Compute dual objective
	var alpha_H_alpha = dot(alpha, H_alpha) ;

	var dual = -0.5 * alpha_H_alpha + C*N - sum_alpha_iyi;

	// Compute primal objective
	var primal = 0.5 * alpha_H_alpha + R_emp;

	if ( primal > info.primal )
		primal = info.primal;

	return {primal: primal, dual: dual, Remp: R_emp, trainingError: trainingErrors / N};
}

MSVM.prototype.predict = function ( x ) {

	var scores = this.predictscore( x );
	if (typeof(scores) != "undefined") {
		if ( this.single_x( x ) ) {
			// single prediction
			return this.recoverLabels( argmax( scores ) );
		}
		else {
			// multiple predictions for multiple test data
			var i;
			var y = new Float64Array(x.length );
			for ( i = 0; i < x.length; i++)  {
				y[i] = findmax ( scores.row(i) ) ;
			}
			return this.recoverLabels( y );
		}
	}
	else
		return undefined;
}
MSVM.prototype.predictscore = function( x ) {


	const Q = this.labels.length;
	const N = size(this.alpha,2);

	if ( this.single_x( x ) ) {

		var output = vectorCopy(this.b);
		var i;
		var k;
		var range_k;
		var partial;

		for(i =0; i< this.SVindexes.length; i++ ) {

			//partial = sumVector( get(alphaSV, i, []) )
			partial = 0;
			for (k=0; k< Q; k++)
				partial += this.alpha.val[k*N + this.SVindexes[i] ];

			var Ki = this.kernelFunc(this.SV.row(i), x);

			for (k=0; k< Q; k++) {

			    switch ( this.MSVMtype ) {
					case "CS":
					    if(this.SVlabels[i] == k)
							output[k] += (partial - this.alpha.val[k*N + this.SVindexes[i] ]) * Ki ;
						else
							output[k] -= this.alpha.val[k*N + this.SVindexes[i] ] * Ki;
						break;
					case "LLW":
					case "MSVM2":
						output[k] += (partial / Q - this.alpha.val[k*N + this.SVindexes[i] ]) * Ki;
						break;
					case "WW":
					default:
					    if(this.SVlabels[i] == k)
					    	output[k] += partial * Ki;
						else
							output[k] -= this.alpha.val[k*N + this.SVindexes[i] ] * Ki;
						break;
				}
	 	    }
		}
		return output; 		// vector of scores for all classes
	}
	else {
		var xi;
		const m = x.length;
		var output = zeros(m, Q);

		var i;
		var k;
		var Kij;
		var partial;

		// Cache SVs
		var SVs = new Array(this.SVindexes.length);
		for ( var j=0; j < this.SVindexes.length; j++)
			SVs[j] = this.SV.row(j);

		for (xi=0; xi < m; xi++) {
			for (k=0; k< Q; k++)
				output.val[xi*Q+k] = this.b[k];

			var Xi = x.row(xi);

			for(i =0; i< this.SVindexes.length; i++ ) {
				Kij = this.kernelFunc(SVs[i], Xi);

				//partial = sumVector( get(alphaSV, i, []) )
				partial = 0;
				for (k=0; k< Q; k++)
					partial += this.alpha.val[k*N + this.SVindexes[i] ];

				for (k=0; k< Q; k++) {

					switch ( this.MSVMtype ) {
						case "CS":
							if(this.SVlabels[i] == k)
								output.val[xi*Q+k] += (partial - this.alpha.val[k*N + this.SVindexes[i] ]) * Kij;
							else
								output.val[xi*Q+k] -= this.alpha.val[k*N + this.SVindexes[i] ] * Kij;
							break;
						case "LLW":
						case "MSVM2":
							output.val[xi*Q+k] += (partial / Q - this.alpha.val[k*N + this.SVindexes[i] ]) * Kij;
							break;
						case "WW":
						default:
							if(this.SVlabels[i] == k)
								output.val[xi*Q+k] += partial * Kij;
							else
								output.val[xi*Q+k] -= this.alpha.val[k*N + this.SVindexes[i] ] * Kij;
							break;
					}
		 	    }
			}
		}

		return output; // matrix of scores is of size Nsamples-by-Nclasses
	}
}

/**************************************************
	K-nearest neighbors (KNN)

	Fast implementation using:
	- partial distances
	(stop summing terms when distance is already greater than farthest neighbor)
	- Features (entries of x) order in decrasing order of variance
	(to try to make partial distances more beneficial)
	- Fast Leave-one-out (LOO): on a training point,
		prediction with K+1 neighbors without taking the nearest one into account
		gives the LOO prediction at that point; so no need to change the training set
	- Fast tuning of K: one prediction on X with K neighbors gives all information about
		k<K nearest neighbors (distances are only computed once for all k)

***************************************************/
function KNN ( params ) {
	var that = new Classifier ( KNN, params);
	return that;
}
KNN.prototype.construct = function (params) {

	// Default parameters:
	this.K = 3;

	// Set parameters:
	if ( params) {
		if ( typeof(params) == "number") {
			this.K = params;
		}
		else {
			var i;
			for (i in params)
				this[i] = params[i];
		}
	}

	// Parameter grid for automatic tuning:
	this.parameterGrid = { "K" : range(1,16) };
}

KNN.prototype.train = function ( X, labels ) {
	// Training function: should set trainable parameters of the model
	//					  and return the training error rate.

	// should start by checking labels (and converting them to suitable numerical values):
	var y = this.checkLabels( labels ) ;

	if ( size(X,2) == 1 ) {
		this.X = matrixCopy(X);
		this.featuresOrder = [0];
		this.relevantFeatures = [0];
	}
	else {
		var v = variance(X,1);
		this.featuresOrder = sort(v.val,true, true);

		var relevantFeatures = find ( isNotEqual(v.val, 0) ) ;
		this.X = getCols(X, getSubVector(this.featuresOrder, relevantFeatures) );
	}
	this.y = matrixCopy(labels); // KNN works directly on true labels

	/* Return training error rate:
	if ( labels.length < 2000)
		return (1 - this.test(X, labels));
		*/
	return this.info();
}
KNN.prototype.update = function ( X, Y ) {
	// Online training: add X,labels to training set
	if ( typeof(this.X) == "undefined" )
		return this.train(X, Y);

	this.X = mat([this.X, X], true);

	if ( this.single_x( X ) )
		var labels = [Y];
	else
		var labels = Y;

	// Make y an Array (easier to push new labels
	if ( Array.isArray(this.y) )
		var y = this.y;
	else
		var y = arrayCopy(this.y);

	for (var i = 0; i<labels.length; i++) {
		y.push( Y[i] );

		// update labels if adding new classes...
		var numericlbl = this.labels.indexOf( labels[i] );
		if(numericlbl < 0 ) {
			numericlbl = this.labels.length;
			this.labels.push( labels[i] );
			this.numericlabels.push( numericlbl );
		}
	}
	this.y = y;

	return this.info();
}

KNN.prototype.predictslow = function ( x ) {
   	const N = this.X.length;
   	if (K >  N) {
   		this.K = N;
   	}
   	const K = this.K;
   	if ( K == 0 ) {
   		return undefined;
   	}

	var tx = type ( x );
	var tX = type(this.X);
	if ( (tx == "vector" && tX == "matrix") || (tx == "number" && tX == "vector" ) ) {
		// Single prediction of a feature vector
		var Xtest = [x];
	}
	else if ( tx == "matrix" || tx == "vector" && tX == "vector") {
		// Multiple predictions for a test set
		var Xtest = x;
	}
	else
		return undefined;

	var labels = new Array(Xtest.length);
	var i;
	var j;

	var distance = zeros(N);

	for ( i=0; i < Xtest.length; i++) {
		var xi = Xtest[i];
	   	//var D = sub(outerprod(ones(N), xi ) , this.X );
	   	//var distance = sum( entrywisemul(D,D), 2); // distance[i] = ||x - Xi||^2
		for ( j=0; j < N; j++) {
			var diff = subVectors(this.X[j], xi);
			distance[j] = dot(diff,diff);
		}
		var votes = zeros(this.labels.length);
		var exaequodistances = zeros(this.labels.length);

		var idx;
		var lbl;
		var k;
		for(k = 0;k < K; k++) {

			idx = findmin( distance );
			lbl = this.labels.indexOf(this.y[idx]);
			votes[ lbl ] += 1;
			exaequodistances[ lbl ] += distance[idx];

			distance[idx] = +Infinity;
		}

		var label = 0;
		var labelcandidates = new Array();
		labelcandidates.push(0);
		var j;
		for(j = 1; j < votes.length; j++) {
			if(votes[j] > votes[label]) {	// find maximum votes
				label = j;
				while (labelcandidates.length > 0 )
					labelcandidates.pop();
			}
			else if ( votes[j] == votes[label] ) {	// while dealing with exaequo
				labelcandidates.push(j);
			}
		}
		// for ex-aequo: take the min sum of distances
		if ( labelcandidates.length > 1 )
			label = findmin( exaequodistances );

		labels[i] = this.labels[label];
	}

	if ( labels.length > 1 )
		return labels;
	else
		return labels[0];
}

/**
 * @param {Float64Array}
 * @param {Matrix}
 * @param {Array}
 * @return {{indexes: Array, distances: Array}}
 */
function nnsearch(x, X, featuresOrder) {

	var neighbor = 0
	var distance = Infinity;
	const dim = X.n;
	const N = X.m

	var i;
	var k;
	var Xi;
	Xi = 0;
	for ( i=0; i < N;  i++) {
	   	var dist = 0;
	   	k=0;
	   	while ( k < dim && dist < distance ) {
			var diff = X.val[Xi + k ] - x[ featuresOrder[k] ];
			dist += diff*diff;
			k++;
		}

		if ( dist < distance ) {
			distance = dist;
			neighbor = i;
		}

	   	Xi += dim;
	}

	return {indexes: [neighbor], distances: [distance]};
}

function knnsearch(K, x, X, featuresOrder) {
	if (type(X) == "vector")
		return knnsearch1D(K, x, X);
	else
		return knnsearchND(K, x, X, featuresOrder);
}

/**
 * @param {number}
 * @param {Float64Array}
 * @param {Matrix}
 * @param {Array}
 * @return {{indexes: Array, distances: Array}}
 */
function knnsearchND(K, x, X, featuresOrder) {

	if (type(X) == "vector")
		return knnsearch1D(K, x, X);

	var neighbors = new Array(K);
	var distances = zeros(K);
	var maxmindist = Infinity;
	const dim = X.n;
	const N = X.m
	if ( typeof (featuresOrder)  == "undefined" )
		var featuresOrder = range(dim);

	var i;

	var Xi = 0;
	for ( i=0; i < N;  i++) {
	   	var dist = 0;

	   	var k=0;

	   	while ( k < dim && dist < maxmindist ) {
			var diff = X.val[Xi + k ] - x[ featuresOrder[k] ];
			dist += diff*diff;
			k++;
		}

		if ( dist < maxmindist ) {
			// Find position of Xi in the list of neighbors
			var l = 0;
			/*if ( i < K ) {
				while ( l < i && dist > distances[l] )
					l++;
			}
			else {
				while ( l < K && l < i && dist > distances[l] )
					l++;
			}		*/
			while ( l < K && l < i && dist > distances[l] )
				l++;
			// insert Xi as the kth neighbor
			//if (l < K ) {
				neighbors.splice(l,0, i);
				neighbors.pop();
				for (var j=K-1; j > l ; j--) {
					distances[j] = distances[j-1];
				}
				distances[l] = dist;

				if ( l == K-1 )
					maxmindist = dist;
			//}
		}

	   	Xi += dim;
	}

	return {indexes: neighbors, distances: distances};
}
/**
 * @param {number}
 * @param {number}
 * @param {Float64Array}
 * @return {{indexes: Array, distances: Array}}
 */
function knnsearch1D(K, x, X) {

	var neighbors = new Array(K);
	var distances = zeros(K);
	var maxmindist = Infinity;

	const N = X.length

	var i;

	for ( i=0; i < N;  i++) {
	   	var dist = X[i] - x;
		dist *= dist;

		if ( dist < maxmindist ) {
			// Find position of Xi in the list of neighbors
			var l = 0;

			while ( l < K && l < i && dist > distances[l] )
				l++;
			// insert Xi as the kth neighbor
			//if (l < K ) {
				neighbors.splice(l,0, i);
				neighbors.pop();
				for (var j=K-1; j > l ; j--) {
					distances[j] = distances[j-1];
				}
				distances[l] = dist;

				if ( l == K-1 )
					maxmindist = dist;
			//}
		}
	}

	return {indexes: neighbors, distances: distances};
}


KNN.prototype.predict = function ( x ) {

   	const N = this.X.length;
   	if (this.K >  N) {
   		this.K = N;
   	}
   	const K = this.K;

   	if ( K == 0 ) {
   		return undefined;
   	}

	const tx = type ( x );
	const tX = type(this.X);
	if ( (tx == "vector" && tX == "matrix") || (tx == "number" && tX == "vector" ) ) {
		// Single prediction of a feature vector
		var Xtest = new Matrix(1, x.length, x);
	}
	else if ( tx == "matrix" || tx == "vector" && tX == "vector") {
		// Multiple predictions for a test set
		var Xtest = x;
	}
	else
		return undefined;

	var labels = new Array(Xtest.length);
	var i;
	var k;
	var idx;
	var lbl;
	var label ;
	var nn ;
	var votes;
	var sumdistances ;
	for ( i=0; i < Xtest.length; i++) {
		// KNN search
		if ( K > 1 )
			nn = knnsearch(K, Xtest.row(i), this.X,  this.featuresOrder );
		else
			nn = nnsearch( Xtest.row(i), this.X,  this.featuresOrder);

		// Compute votes
		votes = zeros(this.labels.length);
		sumdistances = zeros(this.labels.length);

		for(k = 0;k < K; k++) {
			idx = nn.indexes[k];
			lbl = this.labels.indexOf(this.y[idx]);
			votes[ lbl ] += 1;
			sumdistances[ lbl ] += nn.distances[k];
		}

		// Compute label
		label = 0;

		for(k = 1; k < votes.length; k++) {
			if( (votes[k] > votes[label])  || ( votes[k] == votes[label] && sumdistances[ k ] < sumdistances[label] ) ) {
				label = k;
			}
		}

		labels[i] = this.labels[label];
	}

	if ( labels.length > 1 )
		return labels;
	else
		return labels[0];
}
KNN.prototype.tune = function ( X, labels, Xv, labelsv ) {
	// Main function for tuning an algorithm on a given training set (X,labels) by cross-validation
	//	or by error minimization on the validation set (Xv, labelsv);

	if ( arguments.length == 4 ) {
		// validation set (Xv, labelsv)

		// Predict with maximum K while computign labels for all K < maxK
	   	var K = this.parameterGrid.K[this.parameterGrid.K.length - 1];
	   	var N = this.X.length;
	   	if (K >  N) {
	   		K = N;
	   	}
	   	if ( K == 0 ) {
	   		return undefined;
	   	}

		var tx = type ( Xv );
		var tX = type(this.X);
		if ( (tx == "vector" && tX == "matrix") || (tx == "number" && tX == "vector" ) ) {
			// Single prediction of a feature vector
			var Xtest = [Xv];
		}
		else if ( tx == "matrix" || tx == "vector" && tX == "vector") {
			// Multiple predictions for a test set
			var Xtest = Xv;
		}
		else
			return undefined;

		var validationErrors = zeros(K);
		var i;
		var j;
		var k;
		var idx;
		var lbl;
		var label ;
		var nn ;
		var votes;
		var sumdistances ;
		for ( i=0; i < Xtest.length; i++) {
			// KNN search
			if ( K > 1 )
				nn = knnsearch(K, Xtest.val.subarray(i*Xtest.n, (i+1)*Xtest.n), this.X,  this.featuresOrder );
			else
				nn = nnsearch( Xtest.val.subarray(i*Xtest.n, (i+1)*Xtest.n), this.X,  this.featuresOrder );

			// Compute votes
			votes = zeros(this.labels.length);
			sumdistances = zeros(this.labels.length);

			for(k = 0;k < K; k++) {
				idx = nn.indexes[k];
				lbl = this.labels.indexOf(this.y[idx]);
				votes[ lbl ] += 1;
				sumdistances[ lbl ] += nn.distances[k];


				// Compute label with K=k+1 neighbors
				label = 0;

				for(j = 1; j < votes.length; j++) {
					if( (votes[j] > votes[label])  || ( votes[j] == votes[label] && sumdistances[ j ] < sumdistances[label] ) ) {
						label = j;
					}
				}

				// Compute validation error for all K <= maxK
				if ( labelsv[i] != this.labels[label] )
					validationErrors[k] ++;
			}

		}
		var bestK=0;
		var minValidError = Infinity;
		for ( k=0; k < K; k++) {
			validationErrors[k] /= Xtest.length;
			if ( validationErrors[k] < minValidError ) {
				bestK = k+1;
				minValidError = validationErrors[k];
			}
		}

		// set best K in the classifier
		this.K = bestK;

		// and return stats
		return {K: bestK, error: minValidError, validationErrors: validationErrors, Kvalues: range(1,K) };

	}
	else {
		//fast LOO
		/*
			Xi is always the nearest neighbor when testing on Xi
		=>  LOO = single test on (Xtrain,Ytrain) with K+1 neighbors without taking the first one into account
		*/

		// Store whole training set:
		var y = this.checkLabels( labels ) ;
		var v = variance(X,1);
		this.featuresOrder = sort(v.val,true, true);

		var relevantFeatures = find ( isNotEqual(v.val, 0) ) ;
		this.X = getCols(X, getSubVector(this.featuresOrder, relevantFeatures) );
		this.y = matrixCopy(labels); // KNN works directly on true labels

		var N = this.X.length;
		var K = this.parameterGrid.K[this.parameterGrid.K.length - 1]; // max K
		if ( K > N-1)
			K = N-1; // N-1 because LOO...
		K += 1 ; // max K + 1

		var Xtest = X;

		var LOO = zeros(K-1);
		var i;
		var k;
		var idx;
		var lbl;
		var label ;
		var nn ;
		var votes;
		var sumdistances ;
		for ( i=0; i < Xtest.length; i++) {
			// KNN search
			nn = knnsearch(K, Xtest.val.subarray(i*Xtest.n, (i+1)*Xtest.n), this.X,  this.featuresOrder );

			// Compute votes
			votes = zeros(this.labels.length);
			sumdistances = zeros(this.labels.length);

			// Compute label with k neighbors with indexes from 1 to k < K,
			// not taking the first one (of index 0) into account
			for(k = 1 ; k < K; k++) {
				idx = nn.indexes[k];
				lbl = this.labels.indexOf(this.y[idx]);
				votes[ lbl ] += 1;
				sumdistances[ lbl ] += nn.distances[k];


				label = 0;
				for(j = 1; j < votes.length; j++) {
					if( (votes[j] > votes[label])  || ( votes[j] == votes[label] && sumdistances[ j ] < sumdistances[label] ) ) {
						label = j;
					}
				}

				// Compute LOO error
				if ( labels[i] != this.labels[label] )
					LOO[k-1]++;
			}

			// Progress
			if ( (i / Math.floor(0.1*Xtest.length)) - Math.floor(i / Math.floor(0.1*Xtest.length)) == 0 )
				notifyProgress( i / Xtest.length );
		}

		var bestK=0;
		var minLOOerror = Infinity;
		for ( k=0; k < K-1; k++) {
			LOO[k] /= N;
			if ( LOO[k] < minLOOerror ) {
				bestK = k + 1;
				minLOOerror = LOO[k];
			}
		}

		// set best K in the classifier
		this.K = bestK;

		notifyProgress( 1 );
		return {K: bestK, error: minLOOerror, LOOerrors: LOO, Kvalues: range(1,K) };

	}


}



/*************************************************
		Naive Bayes classifier

	- for any product distribution
	- but mostly for Gaussian and Bernoulli
	- use smoothing for parameters of Bernoulli distribution

**************************************************/

function NaiveBayes ( params ) {
	var that = new Classifier ( NaiveBayes, params);
	return that;
}
NaiveBayes.prototype.construct = function (params) {

	// Default parameters:
	this.distribution = "Gaussian";
	this.epsilon = 1;

	// Set parameters:
	var i;
	if ( params) {
		for (i in params)
			this[i] = params[i];
	}

	// Make sure distribution is a string (easier to save/load from files)
	if ( typeof(this.distribution) == "function" )
		this.distribution = this.distribution.name;

	// Parameter grid for automatic tuning:
	this.parameterGrid = {   };
}

NaiveBayes.prototype.tune = function ( X, labels ) {
	var recRate = this.cv(X, labels);
	return {error: (1-recRate), validationErrors: [(1-recRate)]};
}
NaiveBayes.prototype.train = function ( X, labels ) {
	// Training function

	// should start by checking labels (and converting them to suitable numerical values):
	var y = this.checkLabels( labels , true) ; // use 0,1 instead of -1, 1 for binary case

	const dim = X.n;
	this.dim_input = dim;
	this.N = X.m;

	var k;
	this.priors = zeros(this.labels.length);
	this.pX = new Array(this.labels.length);
	for ( k=0; k < this.labels.length; k++ ) {
		var idx = find ( isEqual ( y, this.numericlabels[k] ) );

		this.priors[k] = idx.length / y.length;

		this.pX[k] = new Distribution ( this.distribution );
		this.pX[k].estimate( get(X, idx, []) );

		if ( this.distribution == "Bernoulli" ) {
			// Add smoothing to avoid issues with words never (or always) occuring in training set
			this.pX[k].mean = entrywisediv(add(this.epsilon, mul(idx.length , this.pX[k].mean)), idx.length + 2*this.epsilon);
			this.pX[k].variance = entrywisemul(this.pX[k].mean, sub(1, this.pX[k].mean)) ;
			this.pX[k].std = sqrt(this.pX[k].variance);
		}
	}

	return this;
}
NaiveBayes.prototype.update = function ( X, labels ) {
	// Online training function
	if ( (typeof(this.distribution) == "string" && this.distribution != "Bernoulli") || (typeof(this.distribution) == "function" && this.distribution.name != "Bernoulli") ) {
		error("Online update of NaiveBayes classifier is only implemented for Bernoulli distribution yet");
		return undefined;
	}
	if ( typeof(this.priors) == "undefined" )
		return this.train(X, labels);

	const dim = this.dim_input;
	var tx;

	var oneupdate = function ( x, y, that ) {
		for ( var k=0; k < that.labels.length ; k++) {
			if ( k == y ) {
				var Nk = that.N * that.priors[k];

				that.priors[y] = (Nk + 1) / ( that.N + 1 );

				if ( tx == "vector")  {
					for ( var j=0;j<dim; j++)
						that.pX[k].mean[j] = (that.pX[k].mean[j] * (Nk + 2*that.epsilon) + x[j] ) / (Nk + 1 + 2*that.epsilon);
				}
				else if ( tx == "spvector" ) {
					var jj = 0;
					for ( var j=0;j < x.ind[jj]; j++)
						that.pX[k].mean[j] = (that.pX[k].mean[j] * (Nk + 2*that.epsilon) ) / (Nk + 1 + 2*that.epsilon);
					that.pX[k].mean[x.ind[jj]] = (that.pX[k].mean[x.ind[jj]] * (Nk + 2*that.epsilon) + x.val[jj] ) / (Nk + 1 + 2*that.epsilon);
					jj++;
					while ( jj < x.val.length ) {
						for ( var j=x.ind[jj-1];j<x.ind[jj]; j++)
							that.pX[k].mean[j] = (that.pX[k].mean[j] * (Nk + 2*that.epsilon) ) / (Nk + 1 + 2*that.epsilon);
						that.pX[k].mean[x.ind[jj]] = (that.pX[k].mean[x.ind[jj]] * (Nk + 2*that.epsilon) + x.val[jj] ) / (Nk + 1 + 2*that.epsilon);

						jj++;
					}
				}
			}
			else {
				that.priors[k] = (that.priors[k] * that.N ) / ( that.N + 1 );
			}
		}
		that.N++;
	};



	if ( this.single_x(X) ) {
		tx = type(X);
		oneupdate( X, this.labels.indexOf( labels ), this );
	}
	else {
		var Y = this.checkLabels( labels , true) ;
		tx = type(X.row(0));
		for ( var i=0; i < Y.length; i++)
			oneupdate(X.row(i), Y[i], this);

	}
	return this;
}

NaiveBayes.prototype.predict = function ( x ) {

	var scores = this.predictscore( x );

	if (typeof(scores) != "undefined") {

		if ( this.single_x( x ) ) {
			// single prediction
			return this.recoverLabels( argmax( scores ) );
		}
		else {
			// multiple predictions for multiple test data
			var i;
			var y = zeros(x.length );
			for ( i = 0; i < x.length; i++)  {
				y[i] = findmax ( scores.row(i) ) ;
			}

			return this.recoverLabels( y );
		}
	}
	else
		return undefined;
}

NaiveBayes.prototype.predictscore = function( x ) {

	const tx = type(x);

	if ( this.single_x(x) ) {
		var z = log(this.priors);
		for ( var k=0; k < this.labels.length; k++ ) {
			z[k] += this.pX[k].logpdf( x ) ;
		}

		return z;
	}
	else {
		var z = new Array(this.labels.length);
		for ( var k=0; k < this.labels.length; k++ ) {
			z[k] = addScalarVector(Math.log(this.priors[k]), this.pX[k].logpdf( x ));
		}

		return mat(z);
	}

	return z;
}


/**************************************************
		Decision Trees

		- with error rate criterion
***************************************************/

function DecisionTree ( params ) {
	var that = new Classifier ( DecisionTree, params);
	return that;
}
DecisionTree.prototype.construct = function (params) {

	// Default parameters:
	this.tol = 3;
	this.criterion = "error";

	// Set parameters:
	var i;
	if ( params) {
		for (i in params)
			this[i] = params[i];
	}

	// Parameter grid for automatic tuning:
	this.parameterGrid = {   };
}

DecisionTree.prototype.tune = function ( X, labels ) {
	var recRate = this.cv(X, labels);
	return {error: (1-recRate), validationErrors: [(1-recRate)]};
}
DecisionTree.prototype.train = function ( X, labels ) {
	// Training function

	// should start by checking labels (and converting them to suitable numerical values):
	var y = this.checkLabels( labels , false) ; // use 0,1 instead of -1, 1 for binary case

	const dim = X.n;
	this.dim_input = dim;

	var createNode = function ( indexes, Q, tol ) {
		var node = {};

		// Compute the node label
		var NinClasses = zeros(Q);
		for ( var i=0; i < indexes.length; i++) {
			NinClasses[ y[indexes[i]] ] ++;
		}

		node.label = findmax(NinClasses);
		var Nerrors = indexes.length - NinClasses[node.label];

		if ( Nerrors > tol ) {
			var best_I = Infinity;
			var best_j = 0;
			var best_s = 0;
			for(var j=0; j < dim; j++) {
				for(var i=0;i<indexes.length;i++) {
					var s = X.get(indexes[i],j);

					var idx12 = splitidx( indexes, j, s );
					if ( idx12[0].length > 0 && idx12[1].length > 0 ) {
						var I1 = impurity(idx12[0], Q)	;
						var I2 = impurity(idx12[1], Q)	;
						var splitcost = I1 * idx12[0].length + I2 * idx12[1].length;
						if ( splitcost < best_I ) {
							best_j = j;
							best_s = s;
							best_I = splitcost;
						}
					}
				}
			}
			// Create the node with its children
			node.j = best_j;
			node.s = best_s;
			var idx12 = splitidx( indexes, best_j, best_s );
			node.child1 = createNode( idx12[0], Q, tol );
			node.child2 = createNode( idx12[1], Q, tol );
			node.isLeaf = false;
		}
		else
			node.isLeaf = true;

		return node;
	}
	var NfromClass = function (indexes, k ) {
		var n = 0;
		for ( var i=0; i < indexes.length; i++) {
			if ( y[indexes[i]] == k )
				n++;
		}
		return n;
	}

	var splitidx = function  ( indexes, j ,s) {
		var idx1 = new Array();
		var idx2 = new Array();
		for ( var i=0; i < indexes.length; i++) {
			if ( X.get(indexes[i],j) <= s )
				idx1.push(indexes[i]);
			else
				idx2.push(indexes[i]);
		}
		return [idx1,idx2];
	}

	// create impurity function depending on chosen criterion
	var impurity;
	switch(this.criterion) {
		case "error":
			impurity = function  ( indexes, Q ) {
				if ( indexes.length == 0 )
					return 0;

				var NinClasses = zeros(Q);
				for ( var i=0; i < indexes.length; i++) {
					NinClasses[ y[indexes[i]] ] ++;
				}
				// misclassification rate:
				return (indexes.length - maxVector(NinClasses) ) / indexes.length;
			};
			break;
			/*
		case "gini":
			impurity = function  ( indexes, Q ) {
				console.log("Not yet implemented.");
				return undefined;
			}
			break;
		case "gini":
			impurity = function  ( indexes, Q ) {
				console.log("Not yet implemented.");
				return undefined;
			}
			break;*/
		default:
			return "Unknown criterion: criterion must be \"error\", \"gini\" or \"crossentropy\" (only error is implemented).\n";
	}

	this.tree = createNode( range(y.length), this.labels.length, this.tol );

}

DecisionTree.prototype.predict = function ( x ) {

	var pred = function (node, x) {
		// works only with a vector x
		if ( node.isLeaf ) {
			return node.label;
		}
		else {
			if ( x[node.j] <= node.s)
				return pred(node.child1, x);
			else
				return pred(node.child2, x);
		}
	}

	var tx = type(x) ;
	if ( tx == "matrix" || tx == "vector" && this.dim_input == 1) {
		var lbls = new Array(x.length);
		if( tx == "vector") {
			for ( var i=0; i < x.length; i++)
				lbls[i] = this.labels[pred(this.tree, x[i] )];
		}
		else {
			for ( var i=0; i < x.length; i++)
				lbls[i] = this.labels[pred(this.tree, x.row(i) )];
		}
		return lbls;
	}
	else
		return this.labels[pred(this.tree, x)];
}


/**************************************************
		Logistic Regression (LogReg)

 	  by Pedro Ernesto Garcia Rodriguez, 2014-2015

 	  Training algorithm can be
 	  	- Newton-Raphson (default)
 	  	- stochastic gradient ascent
 	  	- deterministic gradient ascent

***************************************************/

function LogReg ( params ) {
	var that = new Classifier ( LogReg, params);
	return that;
}

LogReg.prototype.construct = function (params) {

	// Default parameters:

	// Set parameters:
	var i;
	if ( params) {
		for (i in params)
			this[i] = params[i];
	}

	// Parameter grid for automatic tuning:
	this.parameterGrid = {   };
}

LogReg.prototype.tune = function ( X, labels ) {
	var recRate = this.cv(X, labels);
	return {error: (1-recRate), validationErrors: [(1-recRate)]};
}

LogReg.prototype.train = function ( X, labels ) {
	// Training function

	// should start by checking labels (and converting them to suitable numerical values):
	var y = this.checkLabels( labels ) ;

	// Call training function depending on binary/multi-class case
	if ( this.labels.length > 2 ) {
		this.trainMulticlass(X, y);
	}
	else {
		var trainedparams = this.trainBinary(X, y);
		this.w = trainedparams.w;
		this.b = trainedparams.b;
		this.dim_input = size(X,2);
	}
	/* and return training error rate:
	return (1 - this.test(X, labels));	*/
	return this.info();
}

LogReg.prototype.predict = function ( x ) {
	if ( this.labels.length > 2)
		return this.predictMulticlass( x ) ;
	else
		return this.predictBinary( x );
}
LogReg.prototype.predictBinary = function ( x ) {

	var scores = this.predictscoreBinary( x , this.w, this.b);
	if (typeof(scores) != "undefined")
		return this.recoverLabels( sign( scores ) );
	else
		return undefined;
}

LogReg.prototype.predictMulticlass = function ( x ) {

	var scores = this.predictscore( x );
	if (typeof(scores) != "undefined") {

		if ( type ( x ) == "matrix" ) {
			// multiple predictions for multiple test data
			var i;
			var y = new Array(x.length );
			for ( i = 0; i < x.length; i++)  {
				var si = scores.row(i);
				y[i] = findmax ( si );
				if (si[y[i]] < 0)
					y[i] = this.labels.length-1;	// The test case belongs to the reference class Q,
													// i.e., the last one
			}
			return this.recoverLabels( y );
		}
		else {
			// single prediction
			y = findmax ( scores );
			if (scores[y] < 0)
				y = this.labels.length-1;  // The test case belongs to the reference class Q,
										  // i.e., the last one
			return this.recoverLabels( y );
		}

	}
	else
		return undefined;
}

LogReg.prototype.predictscore = function( x ) {
	var output;
	if ( this.labels.length > 2) {

		// single prediction
		if ( this.single_x( x ) ) {
			output = add(mul(this.w,x), this.b);
			return output;
		}
		else {
		// multiple prediction for multiple test data
			output = add(mul(x, transposeMatrix(this.w)), mul(ones(x.m), transposeVector(this.b)));
			return output;
		}
	}
	else
		return this.predictscoreBinary( x, this.w, this.b );
}

LogReg.prototype.predictscoreBinary = function( x , w, b ) {
	var output;
	if ( this.single_x( x ) )
		output = b + mul(x, w);
	else
		output = add( mul(x, w) , b);
	return output;
}

/// LogReg training for Binary Classification ////
LogReg.prototype.trainBinary = function ( x, y ) {

	//Adding a column of 'ones' to 'X' to accommodate the y-intercept 'b'
	var X = mat([x, ones(x.m)]);

	var MaxError = 1e-3;
	// var LearningRate = 1e-6, MaxError = 1e-3, params = LogRegBinaryDetGradAscent(x, y, LearningRate, MaxError);
	// var LearningRate = 1e-6, MaxError = 1e-3, params = LogRegBinaryStochGradAscent(x, y, LearningRate, MaxError);

	const AlgorithmKind = "Newton-Raphson";


	///	--- utility functions ---
	function LogRegBinaryStochGradient(j,beta) {

		// Computing the jth-term of the Gradient of the Cost Function
	 	// p = X.n-1 is the feature-space dimensionality.
		// Note that input matrix 'X' contains a last column of 'ones' to accommodate the y-intercept 'b

		var C = (y[j]==1 ? 1 : 0) - 1/(1 + Math.exp(-dot(beta,X.row(j)))); // Note that X.row(j) outputs a column instead a row vector.
				                                                           // Function dot() requires two column vectors

		return mulScalarVector(C, X.row(j));
	}

	function LogRegBinaryDetGradient(beta) {

		// Computing the Deterministic Gradient of the Cost Function
	 	// p = X.n-1 is the feature-space dimensionality.
		// Note that input matrix 'X' contains a last column of 'ones' to accommodate the y-intercept 'b

		var beta_grad = zeros(X.n) ;

		for ( var i = 0; i < X.m; i++) {
			var C = (y[i]==1 ? 1 : 0) - 1/(1 + Math.exp(-dot(beta,X.row(i))));  // Function dot() requires two column vectors. Note that
				                                                                // X.row(i) outputs a column instead a row vector.
			beta_grad = addVectors(beta_grad, mulScalarVector(C, X.row(i)));
		}

		return beta_grad;
	}

	function LogRegBinaryHessian(beta) {

		// Computing the Hessian matrix of the Cost Function
		// p = X.n-1 is the feature-space dimensionality.
		// Note that input matrix 'X' contains a last column of 'ones' to accommodate the y-intercept 'b

		var v_diag = zeros(X.m);
		for ( var i = 0; i < X.m; i++) {
			var p = 1/(1 + Math.exp(-dot(beta,X.row(i))));
			v_diag[i] = p*(p-1);
		}
		var W = diag(v_diag);

		var Hessian = mulMatrixMatrix(transposeMatrix(X), mulMatrixMatrix(W,X));

		return Hessian;
	}

	function LogRegBinaryCostFunction(beta) {

		// p = X.n-1 is the feature-space dimensionality.
		// Note that input matrix 'X' contains a last column of 'ones' to accommodate the y-intercept 'b

		var L = 0;
		for ( var i = 0; i < X.m; i++ ) {
			var betaXi = dot(beta,X.row(i));
			var K = 1 + Math.exp(betaXi);
			L -= Math.log(K);
			if ( y[i] == 1 )
				L += betaXi ;
		}

		return L;
	}


	function LogRegBinaryLearningRate(beta_old, GradientOld_v, Lambda, LambdaMin, LambdaMax, MaxErrorL, MaxError) {

		// Computing the first point 'beta_new' = (w_new, b_new)
		beta = addVectors(beta_old, mulScalarVector(Lambda, GradientOld_v));

		do {
			var Lambda_old = Lambda;

			// Computing the first derivative of the Cost Function respect to the learning rate "Lambda"
			var GradientNew_v = LogRegBinaryDetGradient(beta);
			var FirstDerivLambda = dot(GradientNew_v,GradientOld_v);

			// Computing the second derivative of the Cost Function respect to the learning rate "Lambda"
			var HessianNew = LogRegBinaryHessian(beta);
			var SecondDerivLambda = dot(GradientOld_v, mulMatrixVector(transposeMatrix(HessianNew), GradientOld_v));

			if (!isZero(SecondDerivLambda)) {
				Lambda -= FirstDerivLambda/SecondDerivLambda;
				// console.log("FirstDer:", FirstDerivLambda, "SecondDer:", SecondDerivLambda, -FirstDerivLambda/SecondDerivLambda, Lambda);
				// console.log("Lambda:", Lambda, "Lambda_old:", Lambda_old, Lambda - Lambda_old);
			}

			if (Lambda > LambdaMax || Lambda < LambdaMin)
				Lambda = LambdaMin;

			// Updating the values of the parameters 'beta'
			beta = addVectors(beta_old, mulScalarVector(Lambda, GradientOld_v));

		} while( Math.abs(Lambda-Lambda_old) > MaxErrorL && Math.abs(FirstDerivLambda) > MaxError );
		// if (Lambda > LambdaMax || Lambda < LambdaMin) Lambda = Lambda_old;

		return Lambda;
	}
	// --- end of utility functions ---

	if (AlgorithmKind == "Stochastic Gradient Ascent" ) {

	 	// Stochastic Gradient Optimization Algorithm
	 	// to compute the Y-intercept 'b' and a p-dimensional vector 'w',
		// where p = X.n is the feature-space dimensionality
		// Note that input matrix 'X' contains a last column of 'ones' to accommodate the y-intercept 'b

		// Initial guess for values of parameters beta = w,b
		var beta = divScalarVector(1,transpose(norm(X,1)));

		var i = 0;
		var CostFunctionOld;
		var CostFunctionNew = LogRegBinaryCostFunction(beta);
		do {
			var beta_old = matrixCopy(beta);

			// LearningRate optimization
			if (LearningRate > 1e-8)
				LearningRate *= 0.9999;

			// -- Updating the values of the parameters 'beta' --
			// Doing a complete random sweep across the whole training set
			// before verifying convergence
			var seq = randperm(X.m);
			for ( var k = 0; k < X.m; k++) {

				index = seq[k];
				var GradientOld_v = LogRegBinaryStochGradient(index, beta_old);

				// Updating the values of the parameters 'beta' with just
				// the index-th component of the Gradient
				var Delta_params = mulScalarVector(LearningRate, GradientOld_v);
				beta = addVectors(beta_old, Delta_params);

			}

			//  Checking convergence
			if ( i%1000==0) {
				CostFunctionOld = CostFunctionNew;
				CostFunctionNew = LogRegBinaryCostFunction(beta);
				console.log(AlgorithmKind, i, CostFunctionNew , CostFunctionOld, CostFunctionNew - CostFunctionOld);
			}
			var GradientNorm = norm(GradientOld_v);

			//var PrmtRelativeChange = norm(subVectors(beta,beta_old))/norm(beta_old);
			// if (i%100 == 0)
				//console.log( AlgorithmKind, i, Math.sqrt(GradientNormSq), PrmtRelativeChange );

			i++;

		}  while (GradientNorm > MaxError ); // &&  PrmtRelativeChange > 1e-2);

		var w = getSubVector(beta, range(0, beta.length-1));
		var b = get(beta, beta.length - 1);
	}
	else if ( AlgorithmKind == "Deterministic Gradient Ascent" ) {

	 	// Deterministic Gradient Optimization Algorithm
	 	// to compute the Y-intercept 'b' and a p-dimensional vector 'w',
		// where p = X.n is the feature-space dimensionality
		// Note that input matrix 'X' contains a last column of 'ones' to accommodate the y-intercept 'b

		// Initial guess for values of parameters beta = w,b
		var beta = divScalarVector(1,transpose(norm(X,1)));


		// For LearningRate optimization via a Newton-Raphson algorithm
		var LambdaMin = 1e-12, LambdaMax = 1, MaxErrorL = 1e-9;

		var i = 0;
		var CostFunctionOld;
		var CostFunctionNew = LogRegBinaryCostFunction(beta);
		do {
			var beta_old = matrixCopy(beta);

			var GradientOld_v = LogRegBinaryDetGradient(beta_old);

			//  LearningRate optimization
			// if (LearningRate > 1e-12) LearningRate *= 0.9999;

			// Newton-Raphson algorithm for LearningRate
			LearningRate = LogRegBinaryLearningRate(beta_old, GradientOld_v, LearningRate, LambdaMin, LambdaMax, MaxErrorL, MaxError);

			// Updating the values of the parameters 'beta'
			var Delta_params = mulScalarVector(LearningRate, GradientOld_v);
			beta = addVectors(beta_old, Delta_params);

			// Checking convergence
			if ( i%100==0) {
				CostFunctionOld = CostFunctionNew;
				CostFunctionNew = LogRegBinaryCostFunction(beta);
				console.log(AlgorithmKind, i, CostFunctionNew , CostFunctionOld, CostFunctionNew - CostFunctionOld);
			}

			var GradientNorm = norm(GradientOld_v);
			//var PrmtRelativeChange = norm(subVectors(beta,beta_old))/norm(beta_old);
			// if (i%100 == 0)
			//	console.log( AlgorithmKind, i, Math.sqrt(GradientNormSq), PrmtRelativeChange );

			i++;

		} while ( GradientNorm > MaxError ); // &&  PrmtRelativeChange > 1e-2);

		var w = getSubVector(beta, range(0, beta.length-1));
		var b = get(beta, beta.length - 1);

	}
	else {

		// Newton-Raphson Optimization Algorithm
	 	// to compute the y-intercept 'b' and a p-dimensional vector 'w',
		// where p = X.n-1 is the feature-space dimensionality.
		// Note that input matrix 'X' contains a last column of 'ones' to accommodate the y-intercept 'b

	  	// Initial guess for values of parameters beta = w,b
		var beta = divScalarVector(1,transpose(norm(X,1)));

		var i = 0;
		var CostFunctionOld;
		var CostFunctionNew = LogRegBinaryCostFunction(beta);
		do {

			var beta_old = vectorCopy(beta);

			var GradientOld_v = LogRegBinaryDetGradient(beta_old);

			var HessianOld = LogRegBinaryHessian(beta_old);

			//   Updating the values of the parameters 'beta'
			// var Delta_params = mul(inv(HessianOld),GradientOld_v);
			var Delta_params = solve(HessianOld, GradientOld_v);
			beta = subVectors(beta_old, Delta_params);

			// Checking convergence
			CostFunctionOld = CostFunctionNew;
			CostFunctionNew = LogRegBinaryCostFunction(beta);
			console.log(AlgorithmKind, i, CostFunctionNew , CostFunctionOld, CostFunctionNew - CostFunctionOld);

			var GradientNorm = norm(GradientOld_v);
			// var PrmtRelativeChange = norm(subVectors(beta,beta_old))/norm(beta_old);
			//if (i%100 == 0)
				// console.log( AlgorithmKind + " algorithm:", i, Math.sqrt(GradientNormSq), PrmtRelativeChange );

			i++;

		} while ( GradientNorm  > MaxError ); // &&  PrmtRelativeChange > 1e-2);

		var w = getSubVector(beta, range(0, beta.length-1));
		var b = get(beta, beta.length - 1);

	}

    return {w: w, b : b};
}




// LogReg Multi-class classification ////////////////////
LogReg.prototype.trainMulticlass = function (x, y) {

	//Adding a column of 'ones' to 'X' to accommodate the y-intercept 'b'
	var X = mat([x,ones(x.m)]);

	var LearningRate = 1e-6;
	var MaxError = 1e-3;
	const Q = this.labels.length;
	const AlgorithmKind = "NewtonRaphson";


	// Building a concatenated block-diagonal input matrix "X_conc",
		// by repeating Q-1 times "X" as blocks in the diagonal.
		// Order of X_conc is X.m*(Q-1) x X.n*(Q-1), where X.m = N (size of training set),
		// X.n - 1 = p (feature-space dimensionality) and Q the quantity of classes.

	var X_conc = zeros(X.m*(Q-1),X.n*(Q-1));
	for (var i_class = 0; i_class < Q-1; i_class++)
	    set(X_conc, range(i_class*X.m, (i_class+1)*X.m), range(i_class*X.n, (i_class+1)*X.n), X);

  	var X_concT = transposeMatrix(X_conc);

	// Building a concatenated column-vector of length (y.length)*(Q-1)
		// with the Indicator functions for each class-otput

	var Y_conc = zeros(y.length*(Q-1));
	for (var i_class = 0; i_class < Q-1; i_class++)
	   set(Y_conc, range(i_class*y.length, (i_class+1)*y.length), isEqual(y,i_class));


	///////////// Utility functions /////////////

	function LogRegMultiDetGradient(beta) {

		// Computing the Deterministic Gradient of the Cost Function
		// p = X.n-1 is the feature-space dimensionality.
		// Note that input matrix 'X' contains a last column of 'ones' to accommodate the y-intercept 'b

		// Computing the conditional probabilities for each Class and input vector
		var pi = LogRegProbabilities(beta);

		return mulMatrixVector(X_concT, subVectors(Y_conc,pi));
	}

	function LogRegProbabilities(beta) {
		// Building a concatenated column-vector of length X.m*(Q-1) with
		// the posterior probabilities for each Class and input vector

		var p = zeros((Q-1)*X.m);

		var InvProbClassQ = LogRegInvProbClassQ(beta);
		for ( var i = 0; i < X.m; i++ )
		    for ( i_class = 0; i_class < Q-1; i_class++ ) {
				var betaClass = getSubVector(beta, range(i_class*X.n,(i_class+1)*X.n));
		        p[i_class*X.m + i] = Math.exp(dot(betaClass,X.row(i)))/InvProbClassQ[i];
			}
		return p;
	}

	function LogRegInvProbClassQ(beta) {

		// Computes the inverse of the Posterior Probability that each input vector
		// is labeled with the reference Class (the last one is chosen here)

		var InvProbClass_Q = ones(X.m);
		for ( var i = 0; i < X.m; i++)
			for ( var i_class = 0; i_class < Q-1; i_class++ ) {
				var betaClass = getSubVector(beta, range(i_class*X.n,(i_class+1)*X.n));
				InvProbClass_Q[i] += Math.exp(dot(betaClass,X.row(i)));
			}
		return InvProbClass_Q;
	}

	function LogRegMultiHessian(beta) {
	   	// Computing the Hessian matrix of the Cost Function


		// Computing the conditional probabilities for each Class and input vector
		var p = LogRegProbabilities(beta);

		// Building the Hessian matrix: a concatenated block-diagonal input matrix "W_conc"
		// of order X.m*(Q-1) x X.m*(Q-1), whose blocks W_jk are diagonal matrices as well
		var W_conc = zeros(X.m*(Q-1),X.m*(Q-1));
		for ( var j_class = 0; j_class < Q-1; j_class++ )
		    for ( var k_class = 0; k_class < Q-1; k_class++ ) {
		        var v_diag = zeros(X.m);
		        for ( var i = 0; i < X.m; i++ )
					v_diag[i] = p[j_class*X.m + i]*( (j_class == k_class? 1 : 0) - p[k_class*X.m + i] );

		        var W_jk = diag(v_diag);
		        set(W_conc, range(j_class*X.m, (j_class+1)*X.m), range(k_class*X.m, (k_class+1)*X.m), W_jk);
		    }

		var Hessian = mulMatrixMatrix(transposeMatrix(X_conc), mulMatrixMatrix(W_conc,X_conc));

		return minusMatrix(Hessian);
	}

	function LogRegMultiCostFunction(beta) {

		var InvProbClassQ = LogRegInvProbClassQ(beta);

		// Contribution from all the Classes but the reference Class (the last one is chosen here)
		var L = 0;
		for ( var i_class = 0; i_class < Q-1; i_class++ )
			for ( var i = 0; i < X.m; i++ ) {
				var betaClass = getSubVector(beta, range(i_class*X.n,(i_class+1)*X.n));
				L += (y[i]==i_class? 1: 0)*(dot(betaClass,X.row(i)) - Math.log(InvProbClassQ[i]) );
			}

		// Contribution from the reference Class (the last one is chosen here)
		for ( i = 0; i < X.m; i++ )
			if ( y[i]==Q )
				L -= Math.log(InvProbClassQ[i]);

		return L;
	}

	// --- end of utility functions ---


	if ( AlgorithmKind == "DetGradAscent" ) {
	 	// Deterministic Gradient Optimization Algorithm
	 	// to compute the (Q-1)-dimensional vector of y-intercept 'b' and a px(Q-1)-dimensional matrix 'w',
		// where p = X.n-1 is the feature-space dimensionality and Q the quantity of classes.
		// Note that input matrix 'X' contains a last column of 'ones' to accommodate the y-intercept 'b'

	  	// Initial guess for values of parameters beta
	  	var beta = zeros((Q-1)*X.n);
	  	for (var i_class = 0; i_class < Q-1; i_class++)
			set(beta, range(i_class*X.n,(i_class+1)*X.n), divScalarVector(1,transpose(norm(X,1))));

		var i = 0;
		var CostFunctionOld;
		var CostFunctionNew = LogRegMultiCostFunction(beta);
		do {
			var beta_old = vectorCopy(beta);
//			var CostFunctionOld = LogRegMultiCostFunction(beta_old);

			var GradientOld_v = LogRegMultiDetGradient( beta_old);

			//   LearningRate optimization
			if (LearningRate > 1e-12) LearningRate *= 0.9999;

			//  Updating the values of the parameters 'beta'

			var Delta_params = mulScalarVector(LearningRate, GradientOld_v);
			beta = addVectors(beta_old, Delta_params);

			//  Checking convergence
			if ( i%100==0) {
				CostFunctionOld = CostFunctionNew;
				CostFunctionNew = LogRegMultiCostFunction(beta);
				console.log(AlgorithmKind, i, CostFunctionNew , CostFunctionOld, CostFunctionNew - CostFunctionOld);
			}
			// var CostFunctionDiff = LogRegMultiCostFunction(X, y, Q, beta) - LogRegMultiCostFunction(X, y, Q, beta_old);

			var GradientNormSq = norm(GradientOld_v)*norm(GradientOld_v);
			//var PrmtRelativeChange = norm(subVectors(beta,beta_old))/norm(beta_old);
			//if (i%100 == 0)
			//	console.log( AlgorithmKind + " algorithm:", i, Math.sqrt(GradientNormSq), PrmtRelativeChange );

			i++;

		} while (Math.abs(CostFunctionNew - CostFunctionOld) > 1e-3); //Math.sqrt(GradientNormSq) > MaxError ); // &&  PrmtRelativeChange > 1e-2);

		var betaMatrix = reshape(beta, Q-1, X.n);
		var w_new = get(betaMatrix, range(), range(0, betaMatrix.n-1));
		var b_new = get(betaMatrix, range(), betaMatrix.n-1);
		console.log(betaMatrix,w_new);
	}
	// else if (AlgorithmKind == "Newton-Raphson")
	else {

	 	// Newton-Raphson Optimization Algorithm
	 	// to compute the (Q-1)-dimensional vector of y-intercept 'b' and a px(Q-1)-dimensional matrix 'w',
		// where p = X.n-1 is the feature-space dimensionality and Q the quantity of classes.
		// Note that input matrix 'X' contains a last column of 'ones' to accommodate the y-intercept 'b'

	  	// Initial guess for values of parameters beta
	  	var beta = zeros((Q-1)*X.n);
	  	for (var i_class = 0; i_class < Q-1; i_class++)
			set(beta, range(i_class*X.n,(i_class+1)*X.n), divScalarVector(1,transpose(norm(X,1))));

		var i = 0;
		var CostFunctionOld;
		var CostFunctionNew = LogRegMultiCostFunction(beta);
		do {

			var beta_old = vectorCopy(beta);
			var CostFunctionOld = LogRegMultiCostFunction(beta_old);

			var GradientOld_v = LogRegMultiDetGradient(beta_old);

			var HessianOld = LogRegMultiHessian(beta_old);

			//  Updating the values of the parameters 'beta'
			// var Delta_params = solveWithQRcolumnpivoting(HessianOld, GradientOld_v);
			var Delta_params = solve(HessianOld, GradientOld_v);
			beta = subVectors(beta_old, Delta_params);

			// Checking convergence
			CostFunctionOld = CostFunctionNew;
			CostFunctionNew = LogRegMultiCostFunction(beta);
			console.log(AlgorithmKind, i, CostFunctionNew , CostFunctionOld, CostFunctionNew - CostFunctionOld);


			var GradientNorm = norm(GradientOld_v);
			//var PrmtRelativeChange = norm(subVectors(beta,beta_old))/norm(beta_old);
			//if (i%100 == 0)
			//	console.log( AlgorithmKind + " algorithm:", i, Math.sqrt(GradientNormSq), PrmtRelativeChange );

			i++;

		} while ( GradientNorm > MaxError ); // &&  PrmtRelativeChange > 1e-2);

		var betaMatrix = reshape(beta, Q-1, X.n);
		var w_new = get(betaMatrix, range(), range(0, betaMatrix.n-1));
		var b_new = get(betaMatrix, range(), betaMatrix.n-1);
	}


	this.w = w_new;
	this.b = b_new;

}
//////////////////////////////////////////////////
/////		Generic class for Regressions
////		(implements least squares by default)
///////////////////////////////////////////////////
/**
 * @constructor
 */
function Regression (algorithm, params ) {

	if ( typeof(algorithm) == "undefined" ) {
		var algorithm = AutoReg;
	}
	else if (typeof(algorithm) == "string")
		algorithm = eval(algorithm);

	this.type = "Regression:" + algorithm.name;

	this.algorithm = algorithm.name;
	this.userParameters = params;

	// Functions that depend on the algorithm:
	this.construct = algorithm.prototype.construct;

	this.train = algorithm.prototype.train;
	if (  algorithm.prototype.predict )
		this.predict = algorithm.prototype.predict; // otherwise use default function for linear model

	if (  algorithm.prototype.tune )
		this.tune = algorithm.prototype.tune; // otherwise use default function that does not tune but simply do cv for now...

	if (  algorithm.prototype.path )
		this.path = algorithm.prototype.path;


	// Initialization depending on algorithm
	this.construct(params);
}

Regression.prototype.construct = function ( params ) {
	// Read this.params and create the required fields for a specific algorithm

	// Default parameters:

	this.affine = true;

	// Set parameters:
	var i;
	if ( params) {
		for (i in params)
			this[i] = params[i];
	}

}

Regression.prototype.tune = function ( X, y, Xv, yv ) {
	// Main function for tuning an algorithm on a given data set

	/*
		1) apply cross validation (or test on (Xv,yv) ) to estimate the performance of all sets of parameters
			in this.parameterGrid

		2) pick the best set of parameters and train the final model on all data
			store this model in this.*
	*/

	var validationSet = ( typeof(Xv) != "undefined" && typeof(yv) != "undefined" );

	var n = 0;
	var parnames = new Array();

	if (typeof(this.parameterGrid) != "undefined" ) {
		for ( var p in this.parameterGrid ) {
			parnames[n] = p;
			n++;
		}
	}
	var validationErrors;
	var minValidError = Infinity;
	var bestfit;

	if ( n == 0 ) {
		// no hyperparater to tune, so just train and test
		if ( validationSet ) {
			this.train(X,y);
			var stats = this.test(Xv,yv, true);
		}
		else
			var stats = this.cv(X,y);
		minValidError = stats.mse;
		bestfit = stats.fit;
	}
	else if( n == 1 ) {
		// Just one hyperparameter
		var validationErrors = zeros(this.parameterGrid[parnames[0]].length);
		var bestpar;

		for ( var p =0; p <  this.parameterGrid[parnames[0]].length; p++ ) {
			this[parnames[0]] = this.parameterGrid[parnames[0]][p];
			if ( validationSet ) {
				// use validation set
				this.train(X,y);
				var stats = this.test(Xv,yv, true);
			}
			else {
				// do cross validation
				var stats = this.cv(X,y);
			}
			validationErrors[p] = stats.mse;
			if ( stats.mse < minValidError ) {
				minValidError = stats.mse;
				bestfit = stats.fit;
				bestpar = this[parnames[0]];
			}
			notifyProgress( p / this.parameterGrid[parnames[0]].length ) ;
		}

		// retrain with all data
		this[parnames[0]] = bestpar;
		if ( validationSet )
			this.train( mat([X,Xv], true),reshape( mat([y,yv],true), y.length+yv.length, 1));
		else
			this.train(X,y);
	}
	else if ( n == 2 ) {
		// 2 hyperparameters
		validationErrors = zeros(this.parameterGrid[parnames[0]].length, this.parameterGrid[parnames[1]].length);
		var bestpar = new Array(2);

		var iter = 0;
		for ( var p0 =0; p0 <  this.parameterGrid[parnames[0]].length; p0++ ) {
			this[parnames[0]] = this.parameterGrid[parnames[0]][p0];

			for ( var p1 =0; p1 <  this.parameterGrid[parnames[1]].length; p1++ ) {
				this[parnames[1]] = this.parameterGrid[parnames[1]][p1];

				if ( validationSet ) {
					// use validation set
					this.train(X,y);
					var stats = this.test(Xv,yv, true);
				}
				else {
					// do cross validation
					var stats = this.cv(X,y);
				}
				validationErrors.val[p0*this.parameterGrid[parnames[1]].length + p1] = stats.mse;
				if ( stats.mse < minValidError ) {
					minValidError = stats.mse;
					bestfit = stats.fit;
					bestpar[0] = this[parnames[0]];
					bestpar[1] = this[parnames[1]];
				}
				iter++;
				notifyProgress( iter / (this.parameterGrid[parnames[0]].length *this.parameterGrid[parnames[1]].length) ) ;
			}
		}

		// retrain with all data
		this[parnames[0]] = bestpar[0];
		this[parnames[1]] = bestpar[1];
		if( validationSet )
			this.train( mat([X,Xv], true),reshape( mat([y,yv],true), y.length+yv.length, 1));
		else
			this.train(X,y);
	}
	else {
		// too many hyperparameters...
		error("Too many hyperparameters to tune.");
	}
	notifyProgress( 1 ) ;
	return {error: minValidError, fit: bestfit, validationErrors: validationErrors};
}

Regression.prototype.train = function (X, y) {
	// Training function: should set trainable parameters of the model
	//					  and return the training error.

	return this;

}

Regression.prototype.predict = function (X) {
	// Prediction function (default for linear model)

	var y = mul( X, this.w);

	if ( this.affine  && this.b)
		y = add(y, this.b);

	return y;
}

Regression.prototype.test = function (X, y, compute_fit) {
	// Test function: return the mean squared error (use this.predict to get the predictions)
	var prediction = this.predict( X ) ;

	var i;
	var mse = 0;
	var errors = 0;
	if ( type(y) == "vector") {
		for ( i=0; i < y.length; i++) {
			errors += this.squaredloss( prediction[i] , y[i] );
		}
		mse = errors/y.length; // javascript uses floats for integers, so this should be ok.
	}
	else {
		mse = this.squaredloss( prediction  , y  );
	}


	if ( typeof(compute_fit) != "undefined" && compute_fit)
		return { mse: mse, fit: 100*(1 - norm(sub(y,prediction))/norm(sub(y, mean(y)))) };
	else
		return mse;

}

Regression.prototype.squaredloss = function ( y, yhat ) {
	var e = y - yhat;
	return e*e;
}

Regression.prototype.cv = function ( X, labels, nFolds) {
	// Cross validation
	if ( typeof(nFolds) == "undefined" )
		var nFolds = 5;

	const N = labels.length;
	const foldsize = Math.floor(N / nFolds);

	// Random permutation of the data set
	var perm = randperm(N);

	// Start CV
	var errors = zeros (nFolds);
	var fits = zeros (nFolds);

	var Xtr, Ytr, Xte, Yte;
	var i;
	var fold;
	var tmp;
	for ( fold = 0; fold < nFolds - 1; fold++) {

		Xte = get(X, get(perm, range(fold * foldsize, (fold+1)*foldsize)), []);
		Yte = get(labels, get(perm, range(fold * foldsize, (fold+1)*foldsize)) );

		var tridx = new Array();
		for (i=0; i < fold*foldsize; i++)
			tridx.push(perm[i]);
		for (i=(fold+1)*foldsize; i < N; i++)
			tridx.push(perm[i]);

		Xtr =  get(X, tridx, []);
		Ytr = get(labels, tridx);

		this.train(Xtr, Ytr);
		tmp = this.test(Xte,Yte, true);
		errors[fold] = tmp.mse;
		fits[fold] = tmp.fit;
	}
	// last fold:
	this.train( get(X, get(perm, range(0, fold * foldsize)), []), get(labels, get(perm, range(0, fold * foldsize ) ) ) );
	tmp = this.test(get(X, get(perm, range(fold * foldsize, N)), []), get(labels, get(perm, range(fold * foldsize, N)) ), true);
	errors[fold] = tmp.mse;
	fits[fold] = tmp.fit;

	// Retrain on all data
	this.train(X, labels);

	// Return kFold error
	return {mse: mean(errors), fit: mean(fits)};
}

Regression.prototype.loo = function ( X, labels) {
	return this.cv(X, labels, labels.length);
}

Regression.prototype.info = function () {
	// Print information about the model

	var str = "{<br>";
	var i;
	var Functions = new Array();
	for ( i in this) {
		switch ( type( this[i] ) ) {
			case "string":
			case "boolean":
			case "number":
				str += i + ": " + this[i] + "<br>";
				break;
			case "vector":
				str += i + ": " + printVector(this[i]) + "<br>";
				break;
			case "matrix":
				str += i + ": matrix of size " + this[i].m + "-by-" + this[i].n + "<br>";
				break;
			case "function":
				Functions.push( i );
				break;
			default:
				str += i + ": " + typeof(this[i]) + "<br>";
				break;
		}
	}
	str += "<i>Functions: " + Functions.join(", ") + "</i><br>";
	str += "}";
	return str;
}
/* Utility function
	return true if x contains a single data instance
			false otherwise
*/
Regression.prototype.single_x = function ( x ) {
	var tx = type(x);
	return (tx == "number" || ( this.dim_input > 1 && (tx == "vector" || tx == "spvector" ) ) ) ;
}

//////////////////////////////////////
//// AutoReg: Automatic selection of best algo and parameters
////////////////////////////////////
function AutoReg ( params) {
	var that = new Regression ( AutoReg, params);
	return that;
}
AutoReg.prototype.construct = function ( params ) {
	// Read params and create the required fields for a specific algorithm

	// Default parameters:

	this.linearMethods = ["LeastSquares", "LeastAbsolute", "RidgeRegression", "LASSO"];
	this.linearParams = [undefined, undefined, undefined, {lambda: 1}]; // only those that are not tuned

	this.nonlinearMethods = ["KNNreg", "KernelRidgeRegression", "SVR", "MLPreg"];
	this.nonlinearParams = [undefined, {kernel: "rbf"}, {kernel: "rbf", epsilon: 0.1}, undefined]; // only those that are not tuned

	this.excludes = [];

	this.linear = "auto"; // possible values: "yes", "no", true, false, "auto"

	this.excludes1D = ["LASSO"]; // methods that do not work with size(X,2) = 1

	// Set parameters:
	var i;
	if ( params) {
		for (i in params)
			this[i] = params[i];
	}

}
AutoReg.prototype.train = function ( X, y ) {

	var dim = size(X,2);

	var bestlinearmodel;
	var bestnonlinearmodel;
	var bestmse = Infinity;
	var bestnlmse = Infinity;
	var minmse = 1e-8;

	var m;
	if ( this.linear != "no" && this.linear != false ) {
		// Try linear methods
		m =0;
		while ( m < this.linearMethods.length && bestmse > minmse ) {
			if ( this.excludes.indexOf( this.linearMethods[m] ) < 0 && (dim != 1 || this.excludes1D.indexOf( this.linearMethods[m] ) < 0) ) {
				console.log("Testing " + this.linearMethods[m] );
				var model = new Regression(this.linearMethods[m], this.linearParams[m]);
				var stats = model.cv(X,y);
				if ( stats.mse < bestmse ) {
					bestmse = stats.mse;
					bestlinearmodel = m;
				}
			}
			m++;
		}
		console.log("Best linear method is " + this.linearMethods[bestlinearmodel] + " ( mse = " + bestmse + ")");
	}

	if ( this.linear != "yes" && this.linear != true ) {
		// Try nonlinear methods
		m = 0;
		while ( m < this.nonlinearMethods.length && bestnlmse > minmse ) {
			if ( this.excludes.indexOf( this.nonlinearMethods[m] ) < 0 && (dim != 1 || this.excludes1D.indexOf( this.nonlinearMethods[m] ) < 0) ) {
				console.log("Testing " + this.nonlinearMethods[m] );
				var model = new Regression(this.nonlinearMethods[m], this.nonlinearParams[m]);
				var stats = model.cv(X,y);
				if ( stats.mse < bestnlmse ) {
					bestnlmse = stats.mse;
					bestnonlinearmodel = m;
				}
			}
			m++;
		}
		console.log("Best nonlinear method is " + this.nonlinearMethods[bestnonlinearmodel] + " ( mse = " + bestnlmse + ")");
	}

	// Retrain best model on all data and store it in this.model
	if ( bestmse < bestnlmse ) {
		console.log("Best method is " + this.linearMethods[bestlinearmodel] + " (linear)");
		this.model = new Regression(this.linearMethods[bestlinearmodel], this.linearParams[bestlinearmodel]);
	}
	else {
		console.log("Best method is " + this.nonlinearMethods[bestnonlinearmodel] + " (nonlinear)");
		this.model = new Regression(this.nonlinearMethods[bestnonlinearmodel], this.nonlinearParams[bestnonlinearmodel]);
	}

	this.model.train(X,y);
	return this;
}

AutoReg.prototype.tune = function ( X, y, Xv, yv ) {

	this.train(X,y);
	if  ( typeof(Xv) != "undefined" && typeof(yv) != "undefined" )
		var stats = this.test(Xv,yv, true);
	else
		var stats = this.model.cv(X,y);

	return {error: stats.mse, fit: stats.fit};
}

AutoReg.prototype.predict = function ( X ) {
	if ( this.model )
		return this.model.predict(X);
	else
		return undefined;
}



/**************************************
	 Least Squares

	 implemented by w = X \ y
	 	(QR factorization, unless X is square)
	 or w = cgnr(X,y) for large dimensions (>= 200)
	 	(conjugate gradient normal equation residual method
	 		that can also benefit from sparse X )

	 * Note: for affine regression with sparse X,
	 		 it is faster to provide an X with a column of ones
	 		 (otherwise it is expadned to a full matrix and remade sparse)

***************************************/
function LeastSquares ( params) {
	var that = new Regression ( LeastSquares, params);
	return that;
}
LeastSquares.prototype.construct = function ( params ) {
	// Read this.params and create the required fields for a specific algorithm

	// Default parameters:

	this.affine = true;

	// Set parameters:
	var i;
	if ( params) {
		for (i in params)
			this[i] = params[i];
	}

}
LeastSquares.prototype.train = function (X, y) {
	// Training function: should set trainable parameters of the model
	//					  and return the training error.

	var Xreg;
	if ( this.affine) {
		var tX = type(X);
		if (tX == "spmatrix" || tX == "spvector" )
			Xreg = sparse(mat([full(X), ones(X.length)]));
		else
			Xreg = mat([X, ones(X.length)]);
	}
	else
		Xreg = X;

	// w = (X'X)^-1 X' y (or QR solution if rank-defficient)
	if ( Xreg.m < Xreg.n || Xreg.n < 200 )
		var w = solve( Xreg, y);
	else
		var w = cgnr( Xreg, y);

	if ( this.affine ) {
		this.w = get(w, range(w.length-1));
		this.b = w[w.length-1];
	}
	else {
		this.w = w;
	}

	// Return training error:
	return this.test(X, y);

}


/*************************************
	Least absolute deviations (LeastAbsolute)

	Solve min_w sum_i |Y_i - X(i,:) w|

	via linear programming (using glpk)
**************************************/
function LeastAbsolute ( params) {
	var that = new Regression ( LeastAbsolute, params);
	return that;
}
LeastAbsolute.prototype.construct = function ( params ) {
	// Read this.params and create the required fields for a specific algorithm

	// Default parameters:

	this.affine = true;

	// Set parameters:
	var i;
	if ( params) {
		for (i in params)
			this[i] = params[i];
	}
}

LeastAbsolute.prototype.train = function (X, y) {

	var Xreg;
	if ( this.affine )
		Xreg = mat([ X, ones(X.length) ]);
	else
		Xreg = X;

	var N = size(Xreg,1);
	var d = size(Xreg,2);

	var A = zeros(2*N,d + N);
	set ( A, range(N), range(d), Xreg);
	set ( A, range(N), range(d, N+d), minus(eye(N)) );
	set ( A, range(N, 2*N), range(d), minus(Xreg));
	set ( A, range(N, 2*N), range(d, N+d), minus(eye(N)) );

	var cost = zeros(d+N);
	set ( cost, range(d, d+N), 1);

	var b = zeros(2*N);
	set(b, range(N),y);
	set(b, range(N,2*N), minus(y));

	var lb = zeros(d+N);
	set(lb, range(d), -Infinity);

	var sol = lp(cost, A, b, [], [], lb);

	if ( this.affine ) {
		this.w = get(sol,range(d-1));
		this.b = sol[d-1];
	}
	else
		this.w = get(sol, range(d));

	var e = getSubVector (sol,range(d,d+N));
	this.absoluteError = sumVector(e);

	// return mse
	return dot(e, e);
}

/*********************************************
	K-nearest neighbors
**********************************************/
function KNNreg ( params ) {
	var that = new Regression ( KNNreg, params);
	return that;
}
KNNreg.prototype.construct = function (params) {

	// Default parameters:
	this.K = 5;

	// Set parameters:
	if ( params) {
		if ( typeof(params) == "number") {
			this.K = params;
		}
		else {
			var i;
			for (i in params)
				this[i] = params[i];
		}
	}

	// Parameter grid for automatic tuning:
	this.parameterGrid = { "K" : [1,3,5,7,10,15] };
}

KNNreg.prototype.train = function ( X, y ) {
	// Training function: should set trainable parameters of the model
	//					  and return the training error rate.

	this.X = matrixCopy(X);
	this.y = vectorCopy(y);

	// Return training error rate:
	// return this.test(X, y);
	return this;
}

KNNreg.prototype.predict = function ( x ) {
   	var N = this.X.length;
   	if (this.K >  N) {
   		this.K = N;
   	}
   	const K = this.K;

   	if ( K == 0 ) {
   		return undefined;
   	}

	const tx = type(x);
	const tX = type(this.X);
	if ( tx == "vector" && tX == "matrix") {
		// Single prediction of a feature vector
		var Xtest = new Matrix(1, x.length, x);
	}
	else if (tx == "number" && tX == "vector" ) {
		var Xtest = [x];
	}
	else if ( tx == "matrix"||  ( tx == "vector" && tX == "vector")  ) {
		// Multiple predictions for a test set
		var Xtest = x;
	}
	else
		return "undefined";

	var labels = zeros(Xtest.length);
	var i;
	var dim = size(Xtest,2);
	for ( i=0; i < Xtest.length; i++) {

		if ( dim > 1 )
			var nn = knnsearchND(K, Xtest.row(i), this.X ); // knnsearch is defined in Classifier.js
		else
			var nn = knnsearch1D(K, Xtest[i], this.X ); // knnsearch is defined in Classifier.js

		labels[i] = mean(get(this.y, nn.indexes) );

	}

	if ( labels.length > 1 )
		return labels;
	else
		return labels[0];
}

/***************************************
	 Ridge regression

	Solve min_w ||Y - X*w||^2 + lambda ||w||^2

	as w = (X'X + lambda I) \ X' Y

	actually implemented by the conjugate gradient method:
		solvecg (X'X + lambda I , X'Y)

		so X'X + lambdaI should be positive-definite
			(always possible with lambda large enough)

****************************************/
function RidgeRegression ( params) {
	var that = new Regression ( RidgeRegression, params);
	return that;
}
RidgeRegression.prototype.construct = function ( params ) {
	// Read this.params and create the required fields for a specific algorithm

	// Default parameters:

	this.lambda = 1;
	this.affine = true;

	// Set parameters:
	var i;
	if ( params) {
		for (i in params)
			this[i] = params[i];
	}

	// Parameter grid for automatic tuning:
	this.parameterGrid = { "lambda" : [0.01, 0.1, 1, 5, 10] };
}

RidgeRegression.prototype.train = function (X, y) {
	// Training function: should set trainable parameters of the model
	//					  and return the training error.

	var res = ridgeregression( X, y , this.lambda, this.affine);

	if ( this.affine ) {
		this.w = get(res, range(res.length-1));
		this.b = res[res.length-1];
	}
	else {
		this.w = res;
	}

	// Return training error:
	return this.test(X, y);

}

function ridgeregression( X, y , lambda, affine) {
	// simple function to compute parameter vector of ridge regression
	// (can be used on its own).

	if ( typeof(affine ) == "undefined")
		var affine = true;
	if( typeof(lambda) == "undefined")
		var lambda = 1;

	var Xreg;
	if ( affine)
		Xreg = mat([X, ones(X.length)]);
	else
		Xreg = X;

	// A = X' X + lambda I
	if ( type(Xreg) == "vector" )
		var w = dot(X,y) / ( dot(Xreg,Xreg) + lambda);
	else {
		var Xt = transposeMatrix(Xreg);
		var A = mulMatrixMatrix(Xt, Xreg);
		var n = Xreg.n;
		var nn = n*n;
		var n1 = n+1;
		for ( var i=0; i < nn; i+=n1)
			A.val[i] += lambda;

		// solve Aw = X' y
		var w = solvecg( A, mulMatrixVector(Xt, y) );
	}

	return w;
}



/***************************************
	Kernel ridge regression

	Solve min_(f in RKHS) sum_i (y_i - f(x_i))^2 + lambda ||f||^2

	as f(x) = sum_i alpha_i KernelFunc(x_i , x)
	with alpha = (K + lambda I) \ Y
	where K = kernelMatrix(X)

	implemented with
	- QR solver for small problems (Y.length<=500)
	- conjugate gradient solver (solvecg) for large problems
	- sparse conjugate gradient solver (spsolvecg) for large and sparse K

	Use efficient updates of K for tuning the kernel function
	(see kernelMatrixUpdate() in kernels.js)

****************************************/
function KernelRidgeRegression ( params) {
	var that = new Regression ( KernelRidgeRegression, params);
	return that;
}
KernelRidgeRegression.prototype.construct = function ( params ) {
	// Read this.params and create the required fields for a specific algorithm

	// Default parameters:

	this.lambda = 1;
	this.affine = false;
	this.kernel = "rbf";
	this.kernelpar = kernel_default_parameter("rbf");

	// Set parameters:
	var i;
	if ( params) {
		for (i in params)
			this[i] = params[i];
	}


	// Parameter grid for automatic tuning:
	switch (this.kernel) {
		case "gaussian":
		case "Gaussian":
		case "RBF":
		case "rbf":
			// use multiples powers of 1/sqrt(2) for sigma => efficient kernel updates by squaring
			this.parameterGrid = { "kernelpar": pow(1/Math.sqrt(2), range(0,10)), "lambda" : [ 0.01, 0.1, 1, 5, 10] };
			break;

		case "poly":
			this.parameterGrid = { "kernelpar": [3,5,7,9] , "lambda" : [0.1, 1, 5, 10]  };
			break;
		case "polyh":
			this.parameterGrid = { "kernelpar": [3,5,7,9] , "lambda" : [0.1, 1, 5, 10] };
			break;
		default:
			this.parameterGrid = undefined;
			break;
	}
}

KernelRidgeRegression.prototype.train = function (X, y) {
	// Training function: should set trainable parameters of the model
	//					  and return the training error.

	//this.K = kernelMatrix(X, this.kernel, this.kernelpar); // store K for further tuning use

	// alpha = (K+lambda I)^-1 y

	//var Kreg = add(this.K, mul(this.lambda, eye(this.K.length)));
	var Kreg = kernelMatrix(X, this.kernel, this.kernelpar);
	var kii = 0;
	for ( var i=0; i < Kreg.length; i++) {
		Kreg.val[kii] += this.lambda;
		kii += Kreg.length + 1;
	}

	if ( y.length <= 500 )
		this.alpha = solve(Kreg, y);		// standard QR solver
	else {
		if ( norm0(Kreg) < 0.4 * y.length * y.length )
			this.alpha = spsolvecg(sparse(Kreg), y);	// sparse conjugate gradient solver
		else
			this.alpha = solvecg(Kreg, y);		// dense conjugate gradient solver
	}

	// Set kernel function
	this.kernelFunc = kernelFunction ( this.kernel, this.kernelpar);
	// and input dim
	this.dim_input = size(X, 2);
	if ( this.dim_input == 1 )
		this.X = mat([X]); // make it a 1-column matrix
	else
		this.X = matrixCopy(X);

	/*
	// compute training error:
	var yhat = mulMatrixVector(this.K, this.alpha);
	var error = subVectors ( yhat, y);

	return dot(error,error) / y.length;
	*/
	return this;
}

KernelRidgeRegression.prototype.tune = function (X, y, Xv, yv) {
	// Use fast kernel matrix updates to tune kernel parameter
	// For cv: loop over kernel parameter for each fold to update K efficiently


	// Set the kernelpar range with the dimension
	if ( this.kernel == "rbf" && size(X,2) > 1 ) {
		var saveKpGrid = zeros(this.parameterGrid.kernelpar.length);
		for ( var kp = 0; kp < this.parameterGrid.kernelpar.length ; kp ++) {
			saveKpGrid[kp] = this.parameterGrid.kernelpar[kp];
			this.parameterGrid.kernelpar[kp] *= Math.sqrt( X.n );
		}
	}

	this.dim_input = size(X,2);
	const tX = type(X);

	var K;
	var spK;
	var sparseK = true; // is K sparse?

	var addDiag = function ( value ) {
		// add scalar value on diagonal of K
		var kii = 0;
		for ( var i=0; i < K.length; i++) {
			K.val[kii] += value;
			kii += K.length + 1;
		}
	}
	var spaddDiag = function ( value ) {
		// add scalar value on diagonal of sparse K
		for ( var i=0; i < spK.length; i++) {
			var j = spK.rows[i];
			var e = spK.rows[i+1];
			while ( j < e && spK.cols[j] != i )
				j++;
			if ( j < e )
				spK.val[j] += value;
			else {
				// error: this only works if no zero lies on the diagonal of K
				sparseK = false;
				addDiag(value);
				return;
			}
		}
	}

	if ( arguments.length == 4 ) {
		// validation set (Xv, yv)
		if ( tX == "vector" )
			this.X = mat([X]);
		else
			this.X = X;

		// grid of ( kernelpar, lambda) values
		var validationErrors = zeros(this.parameterGrid.kernelpar.length, this.parameterGrid.C.length);
		var minValidError = Infinity;

		var bestkernelpar;
		var bestlambda;

		K = kernelMatrix( X , this.kernel, this.parameterGrid.kernelpar[0] );

		// Test all values of kernel par
		for ( var kp = 0; kp < this.parameterGrid.kernelpar.length; kp++) {
			this.kernelpar = this.parameterGrid.kernelpar[kp];
			if ( kp > 0 ) {
				// Fast update of kernel matrix
				K = kernelMatrixUpdate( K,  this.kernel, this.kernelpar, this.parameterGrid.kernelpar[kp-1]  );
			}
			sparseK = (norm0(K) < 0.4 * y.length * y.length );
			if ( sparseK )
				spK = sparse(K);

			// Test all values of lambda for the same kernel par
			for ( var c = 0; c < this.parameterGrid.lambda.length; c++) {
				this.lambda = this.parameterGrid.lambda[c];

				// K = K + lambda I
				if ( sparseK ) {
					if ( c == 0 )
						spaddDiag(this.lambda);
					else
						spaddDiag(this.lambda - this.parameterGrid.lambda[c-1] );
				}
				else {
					if ( c == 0 )
						addDiag(this.lambda);
					else
						addDiag(this.lambda - this.parameterGrid.lambda[c-1] );
				}

				// Train model
				if ( y.length <= 500 )
					this.alpha = solve(K, y);		// standard QR solver
				else {
					if ( sparseK )
						this.alpha = spsolvecg(spK, y);	// sparse conjugate gradient solver
					else
						this.alpha = solvecg(K, y);		// dense conjugate gradient solver
				}

				validationErrors.set(kp,c, this.test(Xv,yv) );
				if ( validationErrors.get(kp,c) < minValidError ) {
					minValidError = validationErrors.get(kp,c);
					bestkernelpar = this.kernelpar;
					bestlambda = this.lambda;
				}

				// Recover original K = K - lambda I  for subsequent kernel matrix update
				if ( !sparseK && kp < this.parameterGrid.kernelpar.length - 1 )
					addDiag( -this.lambda );
			}
		}
		this.kernelpar = bestkernelpar;
		this.lambda = bestlambda;
		this.train(mat([X,Xv],true), mat([y,yv], true) ); // retrain with best values and all data
	}
	else {

		// 5-fold Cross validation
		const nFolds = 5;

		const N = y.length;
		const foldsize = Math.floor(N / nFolds);

		// Random permutation of the data set
		var perm = randperm(N);

		// Start CV
		var validationErrors = zeros(this.parameterGrid.kernelpar.length,this.parameterGrid.lambda.length);


		var Xtr, Ytr, Xte, Yte;
		var i;
		var fold;
		for ( fold = 0; fold < nFolds - 1; fold++) {
			console.log("fold " + fold);
			Xte = get(X, get(perm, range(fold * foldsize, (fold+1)*foldsize)), []);
			Yte = get(y, get(perm, range(fold * foldsize, (fold+1)*foldsize)) );

			var tridx = new Array();
			for (i=0; i < fold*foldsize; i++)
				tridx.push(perm[i]);
			for (i=(fold+1)*foldsize; i < N; i++)
				tridx.push(perm[i]);

			Xtr =  get(X, tridx, []);
			Ytr = get(y, tridx);

			if ( tX == "vector" )
				this.X = mat([Xtr]);
			else
				this.X = Xtr;


			// grid of ( kernelpar, lambda) values

			K = kernelMatrix( Xtr , this.kernel, this.parameterGrid.kernelpar[0] );

			// Test all values of kernel par
			for ( var kp = 0; kp < this.parameterGrid.kernelpar.length; kp++) {
				this.kernelpar = this.parameterGrid.kernelpar[kp];
				if ( kp > 0 ) {
					// Fast update of kernel matrix
					K = kernelMatrixUpdate( K,  this.kernel, this.kernelpar, this.parameterGrid.kernelpar[kp-1]  );
				}
				this.kernelFunc = kernelFunction (this.kernel, this.kernelpar);

				var sparseK =  (norm0(K) < 0.4 * K.length * K.length );
				if ( sparseK )
					spK = sparse(K);

				// Test all values of lambda for the same kernel par
				for ( var c = 0; c < this.parameterGrid.lambda.length; c++) {
					this.lambda = this.parameterGrid.lambda[c];

					// K = K + lambda I
					if ( sparseK ) {
						if ( c == 0 )
							spaddDiag(this.lambda);
						else
							spaddDiag(this.lambda - this.parameterGrid.lambda[c-1] );
					}
					else {
						if ( c == 0 )
							addDiag(this.lambda);
						else
							addDiag(this.lambda - this.parameterGrid.lambda[c-1] );
					}

					// Train model
					if ( Ytr.length <= 500 )
						this.alpha = solve(K, Ytr);		// standard QR solver
					else {
						if ( sparseK )
							this.alpha = spsolvecg(spK, Ytr);	// sparse conjugate gradient solver
						else
							this.alpha = solvecg(K, Ytr);		// dense conjugate gradient solver
					}

					validationErrors.val[kp * this.parameterGrid.lambda.length + c] += this.test(Xte,Yte) ;

					// Recover original K = K - lambda I  for subsequent kernel matrix update
					if ( !sparseK && kp < this.parameterGrid.kernelpar.length - 1 )
						addDiag( -this.lambda );
				}
			}
		}
		// last fold:
		console.log("fold " + fold);
		Xtr = get(X, get(perm, range(0, fold * foldsize)), []);
		Ytr = get(y, get(perm, range(0, fold * foldsize ) ) );
		Xte = get(X, get(perm, range(fold * foldsize, N)), []);
		Yte = get(y, get(perm, range(fold * foldsize, N)) );

		if ( tX == "vector" )
			this.X = mat([Xtr]);
		else
			this.X = Xtr;


		// grid of ( kernelpar, lambda) values

		K = kernelMatrix( Xtr , this.kernel, this.parameterGrid.kernelpar[0] );

		// Test all values of kernel par
		for ( var kp = 0; kp < this.parameterGrid.kernelpar.length; kp++) {
			this.kernelpar = this.parameterGrid.kernelpar[kp];
			if ( kp > 0 ) {
				// Fast update of kernel matrix
				K = kernelMatrixUpdate( K,  this.kernel, this.kernelpar, this.parameterGrid.kernelpar[kp-1]  );
			}
			this.kernelFunc = kernelFunction (this.kernel, this.kernelpar);

			var sparseK =  (norm0(K) < 0.4 * K.length * K.length );
			if ( sparseK )
				spK = sparse(K);

			// Test all values of lambda for the same kernel par
			for ( var c = 0; c < this.parameterGrid.lambda.length; c++) {
				this.lambda = this.parameterGrid.lambda[c];

				// K = K + lambda I
				if ( sparseK ) {
					if ( c == 0 )
						spaddDiag(this.lambda);
					else
						spaddDiag(this.lambda - this.parameterGrid.lambda[c-1] );
				}
				else {
					if ( c == 0 )
						addDiag(this.lambda);
					else
						addDiag(this.lambda - this.parameterGrid.lambda[c-1] );
				}

				// Train model
				if ( Ytr.length <= 500 )
					this.alpha = solve(K, Ytr);		// standard QR solver
				else {
					if ( sparseK )
						this.alpha = spsolvecg(spK, Ytr);	// sparse conjugate gradient solver
					else
						this.alpha = solvecg(K, Ytr);		// dense conjugate gradient solver
				}

				validationErrors.val[kp * this.parameterGrid.lambda.length + c] += this.test(Xte,Yte) ;

				// Recover original K = K - lambda I  for subsequent kernel matrix update
				if ( !sparseK && kp < this.parameterGrid.kernelpar.length - 1 )
					addDiag( -this.lambda );
			}
		}

		// Compute Kfold errors and find best parameters
		var minValidError = Infinity;
		var bestlambda;
		var bestkernelpar;

		// grid of ( kernelpar, lambda) values
		for ( var kp = 0; kp < this.parameterGrid.kernelpar.length; kp++) {
			for ( var c = 0; c < this.parameterGrid.lambda.length; c++) {
				validationErrors.val[kp * this.parameterGrid.lambda.length + c] /= nFolds;
				if(validationErrors.val[kp * this.parameterGrid.lambda.length + c] < minValidError ) {
					minValidError = validationErrors.val[kp * this.parameterGrid.lambda.length + c];
					bestlambda = this.parameterGrid.lambda[c];
					bestkernelpar = this.parameterGrid.kernelpar[kp];
				}
			}
		}
		this.lambda = bestlambda;
		this.kernelpar = bestkernelpar;

		// Retrain on all data
		this.train(X, y);
	}

	this.validationError = minValidError;
	return {error: minValidError, validationErrors: validationErrors};
}

KernelRidgeRegression.prototype.predict = function (X) {
	// Prediction function f(x) = sum_i alpha_i K(x_i, x)

	/*	This works, but we do not need to store K
	var K = kernelMatrix(this.X, this.kernel, this.kernelpar, X);
	var y = transpose(mul(transposeVector(this.alpha), K));
	*/
	var i,j;

	if ( this.single_x( X ) ) {
		if ( this.dim_input == 1 )
			var xvector = [X];
		else
			var xvector = X;
		var y = 0;
		for ( j=0; j < this.alpha.length; j++ )
			y += this.alpha[j] * this.kernelFunc(this.X.row(j), xvector);
	}
	else {
		var y = zeros(X.length);
		for ( j=0; j < this.alpha.length; j++ ) {
			var Xj = this.X.row(j);
			var aj = this.alpha[j];
			for ( i=0; i < X.length; i++ ) {
				if ( this.dim_input == 1 )
					var xvector = [X[i]];
				else
					var xvector = X.row(i);
				y[i] += aj * this.kernelFunc(Xj, xvector);
			}
		}
	}
	return y;
}

/****************************************************
		Support vector regression (SVR)

	training by SMO as implemented in LibSVM
*****************************************************/
function SVR ( params) {
	var that = new Regression ( SVR, params);
	return that;
}
SVR.prototype.construct = function (params) {

	// Default parameters:

	this.kernel = "linear";
	this.kernelpar = undefined;

	this.C = 1;
	this.epsilon = 0.1;

	// Set parameters:
	var i;
	if ( params) {
		for (i in params)
			this[i] = params[i];
	}

	// Parameter grid for automatic tuning:
	switch (this.kernel) {
		case "linear":
			this.parameterGrid = { "C" : [0.001, 0.01, 0.1, 1, 5, 10, 100] };
			break;
		case "gaussian":
		case "Gaussian":
		case "RBF":
		case "rbf":
			this.parameterGrid = { "kernelpar": [0.1,0.2,0.5,1,2,5] , "C" : [0.001, 0.01, 0.1, 1, 5, 10, 100] };
			break;

		case "poly":
			this.parameterGrid = { "kernelpar": [3,5,7,9] , "C" : [0.001, 0.01, 0.1, 1, 5, 10, 100]  };
			break;
		case "polyh":
			this.parameterGrid = { "kernelpar": [3,5,7,9] , "C" : [0.001, 0.01, 0.1, 1, 5, 10, 100] };
			break;
		default:
			this.parameterGrid = undefined;
			break;
	}
}

SVR.prototype.train = function (X, y) {
	// Training SVR with SMO

	// Prepare
	const C = this.C;
	const epsilon = this.epsilon;

	/* use already computed kernelcache if any;
	var kc;
	if (typeof(this.kernelcache) == "undefined") {
		// create a new kernel cache if none present
		kc = new kernelCache( X , this.kernel, this.kernelpar );
	}
	else
		kc = this.kernelcache;
	*/
	var kc = new kernelCache( X , this.kernel, this.kernelpar );

	var i;
	var j;
	const N = X.length;	// Number of data
	const m = 2*N;	// number of optimization variables

	// linear cost c = [epsilon.1 + y; epsilon.1 - y]
	var c = zeros(m) ;
	set(c, range(N), add(epsilon, y) );
	set(c, range(N, m), sub(epsilon, y));

	// Initialization
	var alpha = zeros(m); // alpha = [alpha, alpha^*]
	var b = 0;
	var grad = vectorCopy(c);
	var yc = ones(m);
	set(yc, range(N, m), -1);	// yc = [1...1, -1...-1] (plays same role as y for classif in SMO)

	// SMO algorithm
	var index_i;
	var index_j;
	var alpha_i;
	var alpha_j;
	var grad_i;
	var grad_j;
	var Q_i = zeros(m);
	var Q_j = zeros(m);
	var ki;
	var kj;
	var Ki;
	var Kj;

	const tolalpha = 0.001; // tolerance to detect margin SV

	const TOL = 0.001; // TOL on the convergence
	var iter = 0;
	do {
		// working set selection => {index_i, index_j }
		var gradmax = -Infinity;
		var gradmin = Infinity;

		for (i=0; i< m; i++) {
			alpha_i = alpha[i];
			grad_i = grad[i];
			if ( yc[i] == 1 && alpha_i < C *(1-tolalpha) && -grad_i > gradmax ) {
				index_i = i;
				gradmax = -grad_i;
			}
			else if ( yc[i] == -1 && alpha_i > C * tolalpha  && grad_i > gradmax ) {
				index_i = i;
				gradmax = grad_i;
			}

			if ( yc[i] == -1 && alpha_i < C *(1-tolalpha) && grad_i < gradmin ) {
				index_j = i;
				gradmin = grad_i;
			}
			else if ( yc[i] == 1 && alpha_i > C * tolalpha && -grad_i < gradmin ) {
				index_j = i;
				gradmin = -grad_i;
			}
			//console.log(i,index_i,index_j,alpha_i,grad_i, gradmin, gradmax,yc[i] == -1);
		}


		// Analytical solution
		i = index_i;
		j = index_j;
		if ( i < N )
			ki = i;	// index of corresponding row in K
		else
			ki = i - N;
		if ( j < N )
			kj = j;	// index of corresponding row in K
		else
			kj = j - N;

		//  Q = [[ K, -K ], [-K, K] ]: hessian of optimization wrt 2*N vars
		//  Q[i][j] = yc_i yc_j K_ij
		//set(Q_i, range(N), mul( yc[i] , kc.get_row( ki ) )); // ith row of Q : left part for yc_j = 1
		//set(Q_i, range(N,m), mul( -yc[i] , kc.get_row( ki ) )); // ith row of Q : right part for yc_j = -1
		//set(Q_j, range(N), mul( yc[j] , kc.get_row( kj ) )); // jth row of Q : left part
		//set(Q_j, range(N,m), mul( -yc[j] , kc.get_row( kj ) )); // jth row of Q : right part

		Ki = kc.get_row( ki );
		if ( yc[i] > 0 ) {
			Q_i.set(Ki);
			Q_i.set(minus(Ki), N);
		}
		else {
			Q_i.set(minus(Ki));
			Q_i.set(Ki, N);
		}

		Kj = kc.get_row( kj );
		if ( yc[j] > 0 ) {
			Q_j.set(Kj);
			Q_j.set(minus(Kj), N);
		}
		else {
			Q_j.set(minus(Kj));
			Q_j.set(Kj, N);
		}

		alpha_i = alpha[i];
		alpha_j = alpha[j];
		grad_i = grad[i];
		grad_j = grad[j];

		// Update alpha and correct to remain in feasible set
		if ( yc[i] != yc[j] ) {
			var diff = alpha_i - alpha_j;
			var delta = -(grad_i + grad_j ) / ( Q_i[i] + Q_j[j] + 2 * Q_i[j] );
			alpha[j] = alpha_j + delta;
			alpha[i] = alpha_i + delta;

			if( diff > 0 ) {
				if ( alpha[j] < 0 ) {
					alpha[j] = 0;
					alpha[i] = diff;
				}
			}
			else
			{
				if(alpha[i] < 0)
				{
					alpha[i] = 0;
					alpha[j] = -diff;
				}
			}
			if(diff > 0 )
			{
				if(alpha[i] > C)
				{
					alpha[i] = C;
					alpha[j] = C - diff;
				}
			}
			else
			{
				if(alpha[j] > C)
				{
					alpha[j] = C;
					alpha[i] = C + diff;
				}
			}
		}
		else {
			var sum = alpha_i + alpha_j;
			var delta = (grad_i - grad_j) / ( Q_i[i] + Q_j[j] - 2 * Q_i[j] );
			alpha[i] = alpha_i - delta;
			alpha[j] = alpha_j + delta;

			if(sum > C)
			{
				if(alpha[i] > C)
				{
					alpha[i] = C;
					alpha[j] = sum - C;
				}
			}
			else
			{
				if(alpha[j] < 0)
				{
					alpha[j] = 0;
					alpha[i] = sum;
				}
			}
			if(sum > C)
			{
				if(alpha[j] > C)
				{
					alpha[j] = C;
					alpha[i] = sum - C;
				}
			}
			else
			{
				if(alpha[i] < 0)
				{
					alpha[i] = 0;
					alpha[j] = sum;
				}
			}
		}

		// gradient = Q alpha + c
		// ==>  grad += Q_i* d alpha_i + Q_j d alpha_j; Q_i = Q[i] (Q symmetric)
		grad = add( grad, add ( mul( alpha[i] - alpha_i, Q_i ) , mul( alpha[j] - alpha_j, Q_j )));


		iter++;
	} while ( iter < 100000 && gradmax - gradmin > TOL ) ;


	// Compute b=(r2 - r1) / 2, r1 = sum_(0<alpha_i<C && yci==1) grad_i / #(0<alpha_i<C && yci==1), r2=same with yci==-1
	var r1 = 0;
	var r2 = 0;
	var Nr1 = 0;
	var Nr2 = 0;
	var gradmax1 = -Infinity;
	var gradmin1 = Infinity;
	var gradmax2 = -Infinity;
	var gradmin2 = Infinity;
	for(i=0;i < m ;i++) {
		if ( alpha[i] > tolalpha*C && alpha[i] < (1.0 - tolalpha) * C ) {
			if ( yc[i] == 1 ) {
				r1 += grad[i];
				Nr1++;
			}
			else {
				r2 += grad[i];
				Nr2++;
			}
		}

		else if ( alpha[i] >= (1.0 - tolalpha) * C ) {
			if ( yc[i] == 1 && grad[i] > gradmax1 )
				gradmax1 = grad[i];
			if ( yc[i] == -1 && grad[i] > gradmax2 )
				gradmax2 = grad[i];
		}

		else if ( alpha[i] <= tolalpha * C ) {
			if ( yc[i] == 1 && grad[i] < gradmin1 )
				gradmin1 = grad[i];
			if ( yc[i] == -1 && grad[i] < gradmin2 )
				gradmin2 = grad[i];
		}
	}
	if( Nr1 > 0 )
		r1 /= Nr1;
	else
		r1 = (gradmax1 + gradmin1) / 2;
	if( Nr2 > 0 )
		r2 /= Nr2;
	else
		r2 = (gradmax2 + gradmin2) / 2;

	b = -(r2 - r1) / 2;



	/* Find support vectors	*/
	var nz = isGreater(alpha, 1e-6);

	alpha = entrywisemul(nz, alpha); // zeroing small alpha_i
	this.alpha = sub ( get(alpha,range(N,m)), get(alpha, range(N)) ); // alpha_final = -alpha + alpha^*
	this.SVindexes = find(this.alpha); // list of indexes of SVs
	this.SV = get(X,this.SVindexes, []) ;

	this.dim_input = 1;
	if ( type(X) == "matrix")
		this.dim_input = X.n; // set input dimension for checks during prediction

	// Compute w for linear models
	var w;
	if ( this.kernel == "linear" ) {
		w = transpose(mul( transpose( get (this.alpha, this.SVindexes) ), this.SV ));
	}


	if ( typeof(this.kernelcache) == "undefined")
		this.kernelcache = kc;


	this.b = b;
	this.w = w;

	// Set kernel function
	if ( this.dim_input > 1 )
		this.kernelFunc = this.kernelcache.kernelFunc;
	else
		this.kernelFunc = kernelFunction(this.kernel, this.kernelpar, "number"); // for scalar input

	// and return training error rate:
	// return this.test(X, y); // XXX use kernel cache instead!!
	return this;
}


SVR.prototype.predict = function ( x ) {

	var i;
	var j;
	var output;

	if ( this.kernel =="linear" && this.w)
		return add( mul(x, this.w) , this.b);

	if ( this.single_x(x) ) {
		output = this.b;

		if ( this.dim_input > 1 ) {
			for ( j=0; j < this.SVindexes.length; j++)
				output += this.alpha[this.SVindexes[j]] * this.kernelFunc( this.SV.row(j), x);
		}
		else {
			for ( j=0; j < this.SVindexes.length; j++)
				output += this.alpha[this.SVindexes[j]] * this.kernelFunc( this.SV[j], x);
		}
		return output;
	}
	else if ( this.dim_input == 1) {
		output = zeros(x.length);
		for ( i=0; i < x.length; i++) {
			output[i] = this.b;
			for ( j=0; j < this.SVindexes.length; j++) {
				output[i] += this.alpha[this.SVindexes[j]] * this.kernelFunc( this.SV[j], x[i]);
			}
		}
		return output;
	}
	else {
		// Cache SVs
		var SVs = new Array(this.SVindexes.length);
		for ( j=0; j < this.SVindexes.length; j++)
			SVs[j] = this.SV.row(j);

		output = zeros(x.length);
		for ( i=0; i < x.length; i++) {
			output[i] = this.b;
			var xi = x.row(i);
			for ( j=0; j < this.SVindexes.length; j++)
				output[i] += this.alpha[this.SVindexes[j]] * this.kernelFunc( SVs[j], xi);
		}
		return output;
	}
}


/****************************************************
	  LASSO

	 Solves min_w ||Y - X*w||^2 + lambda ||w||_1

	Training by Soft-thresholding for orthonormal X
	or coordinate descent as in
	T.T. Wu and K. Lange, Annals of Applied Statistics, 2008

*****************************************************/

function LASSO ( params) {
	var that = new Regression ( LASSO, params);
	return that;
}
LASSO.prototype.construct = function ( params ) {
	// Read this.params and create the required fields for a specific algorithm

	// Default parameters:

	this.lambda = 1;
	this.affine = true;

	// Set parameters:
	var i;
	if ( params) {
		for (i in params)
			this[i] = params[i];
	}
}

LASSO.prototype.train = function (X, y, softthresholding) {
	// Training function: should set trainable parameters of the model
	//					  and return the training error.

	var M = Infinity; // max absolute value of a parameter w and b

	var Xreg;
	if ( this.affine)
		Xreg = mat([X, ones(X.length)]);
	else
		Xreg = X;



	var d = 1;
	if ( type(Xreg) == "matrix")
		d = Xreg.n;
	var dw = d;
	if ( this.affine )
		dw--;

	if ( typeof(softthresholding) =="undefined") {
		// Test orthonormality of columns
		var orthonormality = norm ( sub(eye(dw) , mul(transpose(X), X) ) );

		if ( orthonormality < 1e-6 ) {
			console.log("LASSO: orthonormal columns detected, using soft-thresholding.");
			var softthresholding = true;
		}
		else {
			console.log("LASSO: orthonormalilty = " + orthonormality + " > 1e-6, solving QP...");
			var softthresholding = false;
		}
	}

	if ( softthresholding ) {
		// Apply soft-thresholding assuming orthonormal columns in Xreg

		var solLS = solve(Xreg, y);
		var wLS = get ( solLS, range(dw) );

		var tmp = sub(abs(wLS) , this.lambda) ;

		this.w = entrywisemul( sign(wLS), entrywisemul(isGreater(tmp, 0) , tmp) );

		if ( this.affine ) {
			this.b = solLS[dw];
		}

		// Return training error:
		return this.test(X, y);
	}

	if ( dw == 1 )
		return "should do softthresholding";

	// Coordinate descent
	var b = randn();
	var bprev ;
	var w = zeros(dw);
	var wprev = zeros(dw);
	var residues = subVectors ( y, addScalarVector(b, mul(X, w))) ;
	var sumX2 = sum(entrywisemul(X,X),1).val;

	// Make Xj an Array of features
	var Xt = transposeMatrix(X);
	var Xj = new Array(Xt.m);
	for ( var j=0; j < dw; j++) {
		Xj[j] = Xt.row(j);
	}


	var iter = 0;
	do {
		bprev = b;
		b += sumVector(residues) / y.length;
		residues = add (residues , bprev - b);


		for ( var j=0; j < dw; j++) {
			wprev[j] = w[j];

			var dgdW = -dot( residues, Xj[j] );
			var updateneg = w[j] - (dgdW - this.lambda) / sumX2[j];
			var updatepos = w[j] - (dgdW + this.lambda) / sumX2[j];

			if ( updateneg < 0 )
				w[j] = updateneg;
			else if (updatepos > 0 )
				w[j] = updatepos;
			else
				w[j] = 0;
			if ( !isZero(w[j] - wprev[j]))
				residues = addVectors(residues, mulScalarVector(wprev[j] - w[j], getCols(X,[j])) );
		}

		iter++;
	} while ( iter < 1000 && norm(sub(w,wprev)) > y.length * 1e-6 ) ;
	console.log("LASSO coordinate descent ended after " + iter + " iterations");

	this.w = w;
	this.b = b;

	return this;

}
LASSO.prototype.tune = function (X,y,Xv,yv) {
	// TODO use lars to compute the full path...

}


/**************************************
	 LARS

	Compute entire regularization path
	for lars or lasso (parameter = { method: "lars" or "lasso"})

	use efficient Cholesky updates when adding/removing variables.

***************************************/
function LARS ( params) {
	var that = new Regression ( LARS, params);
	return that;
}
LARS.prototype.construct = function ( params ) {
	// Read this.params and create the required fields for a specific algorithm

	// Default parameters:

	this.method = "lars";
	this.n = undefined;

	// Set parameters:
	var i;
	if ( params) {
		for (i in params)
			this[i] = params[i];
	}

	this.affine = true;	// cannot be changed otherwise y cannot be centered
}

LARS.prototype.train = function (X, y) {
	// Training function: should set trainable parameters of the model
	//					  and return the training error.
	if ( typeof(this.n) != "number" ) {
		console.log("LARS: using n=3 features by default");
		this.n = 3;
	}
	this.path = lars(X,y,this.method, this.n);
	this.w = get(this.path,range(X.n), this.n);
	this.b = this.path.val[X.n * this.path.n + this.n];
	this.support = find( isNotEqual(this.w, 0) );
	return this;
}
LARS.prototype.predict = function (X, y) {

	var y = add(mul( X, this.w), this.b);
	// XXX should do a sparse multiplication depending on the support of w...

	return y;
}
LARS.prototype.tune = function (X, y, Xv, yv) {
	// TODO: compute path for all folds of cross validation
	// and test with mul(Xtest, path)...

}
LARS.prototype.path = function (X, y) {
	// TODO: compute path for all folds of cross validation
	// and test with mul(Xtest, path)...
	return lars(X,y, this.method, this.n);
}
function lars (X,Y, method, n) {
	if ( type(X) != "matrix" )
		return "Need a matrix X with at least 2 columns to apply lars().";
	if ( arguments.length < 4 )
		var n = X.n;
	if ( arguments.length < 3 )
		var method = "lars";


	const N = X.length;
	const d = X.n;

	// --- utilities ---
	//Function that updates cholesky factorization of X'X when adding column x to X
	var updateR = function (x, R, Xt, rank) {
			var xtx = dot(x,x);
			const tR = typeof ( R ) ;
			if (tR == "undefined")
				return {R: Math.sqrt(xtx), rank: 1};
			else if ( tR == "number" ) {
				// Xt is a vector
				var Xtx = dot(Xt,x);
				var r = Xtx / R;
				var rpp = xtx - r*r;
				var newR = zeros(2,2);
				newR.val[0] = R;
				newR.val[2] = r;
				if(rpp <= EPS) {
					rpp = EPS;
					var newrank = rank;
				}
				else {
					rpp = Math.sqrt(rpp);
					var newrank = rank+1;
				}

				newR.val[3] = rpp;
			}
			else {
				/* X and R are matrices : we have RR' = X'X
					 we want [R 0; r', rpp][R 0;r', rpp]' = [X x]'[X x] = [ X'X X'x; x'X x'x]
					 last column of matrix equality gives
					    Rr = X'x
					and r'r + rpp^2 = x'x => rpp = sqrt(x'x - r'r)
				*/
				var Xtx = mulMatrixVector( Xt, x);
				var r = forwardsubstitution( R, Xtx) ;
				var rpp = xtx - dot(r,r);
				const sizeR = r.length;
				var newR = zeros(sizeR+1,sizeR+1);
				for ( var i=0; i < sizeR; i++)
					for ( var j=0; j <= i; j++)
						newR.val[i*(sizeR+1) + j] = R.val[i*sizeR+j];
				for ( var j=0; j < sizeR; j++)
					newR.val[sizeR*(sizeR+1) + j] = r[j];

				if(rpp <= EPS) {
					rpp = EPS;
					var newrank = rank;
				}
				else {
					rpp = Math.sqrt(rpp);
					var newrank = rank+1;
				}
				newR.val[sizeR*(sizeR+1) + sizeR] = rpp;

			}

			return {R: newR, rank: newrank};
		};
	// Function that downdates cholesky factorization of X'X when removing column j from X (for lasso)
	var downdateR = function (j, R, rank) {
			var idx = range(R.m);
			idx.splice(j,1);
			var newR = getRows (R, idx); // remove jth row
			// apply givens rotations to zero the last row
			const n = newR.n;

			for ( var k=j;k < newR.n-1 ; k++) {
				cs = givens(newR.val[k*n + k],newR.val[k*n + k + 1]);

				for ( var jj=k; jj < newR.m; jj++) {
					var rj = jj*n;
					var t1;
					var t2;
						t1 = newR.val[rj + k];
						t2 = newR.val[rj + k+1];
						newR.val[rj + k] = cs[0] * t1 - cs[1] * t2;
						newR.val[rj + k+1] = cs[1] * t1 + cs[0] * t2;
					}
			}
			// and remove last zero'ed row before returning
			return {R: getCols(newR, range(newR.m)), rank: rank-1};
			// note: RR' is correct but R has opposite signs compared to chol(X'X)
		};
	// ----


	// Normalize features to mean=0 and norm=1
	var i,j,k;
	var Xt = transposeMatrix(X);
	var meanX = mean(Xt,2);
	Xt = sub(Xt, outerprod(meanX,ones(N)));
	var normX = norm(Xt,2);
	for ( j=0; j < d; j++) {
		if( isZero(normX[j]) ) {
			// TODO deal with empty features...
		}
		else if( Math.abs(normX[j] - 1) > EPS ) { // otherwise no need to normalize
			k=j*N;
			for ( i=0; i< N; i++)
				Xt.val[k + i] /= normX[j];
		}
	}

	// Intialization
	var meanY = mean(Y);
	var r = subVectorScalar(Y,meanY);	// residuals (first step only bias = meanY)

	var activeset = new Array(); // list of active features
	var s; // signs
	var inactiveset = ones(d);

	var beta = zeros(d);
	var betas = zeros(d+1,d+1);
	betas.val[d] = meanY; // (first step only bias = meanY)
	var nvars = 0;

	var XactiveT;
	var R;
	var w;
	var A;
	var Ginv1;
	var gamma;
	var drop = -1;

	var maxiters = d;
	if ( d > N-1 )
		maxiters = N-1;
	if (maxiters > n )
		maxiters = n;

	var lambda = new Array(maxiters);
	lambda[0] = Infinity; // only bias term in first solution

	// Initial correlations:
	var correlations = mulMatrixVector(Xt,r);


	var iter = 1;
	do {

		// update active set
		var C = -1;
		for (var k=0; k < d; k++) {
			if ( inactiveset[k] == 1 && Math.abs(correlations[k] ) > C)
				C = Math.abs(correlations[k] ) ;
		}

		lambda[iter] = C;

		for (var k=0; k < d; k++) {
			if ( inactiveset[k] == 1 && isZero(Math.abs(correlations[k]) - C) ) {
				activeset.push( k );
				inactiveset[k] = 0;
			}
		}
		s = signVector(getSubVector(correlations, activeset) );

		// Use cholesky updating to compute Ginv1
		if ( activeset.length == 1 ) {

			R = updateR(Xt.row(activeset[0]) );
			A = 1;
			w = s[0];
			XactiveT = Xt.row(activeset[0]);

			var u = mulScalarVector(w, XactiveT);

		}
		else {
			var xj = Xt.row(activeset[activeset.length - 1]);
			R = updateR(xj, R.R, XactiveT, R.rank);

			if ( R.rank < activeset.length ) {
				// skip this feature that is correlated with the others
				console.log("LARS: dropping variable " + activeset[activeset.length - 1] + " (too much correlation)");
				activeset.splice(activeset.length-1, 1);
				continue;
			}

			Ginv1 = backsubstitution( transposeMatrix(R.R), forwardsubstitution( R.R , s) ) ;
			A = 1 / Math.sqrt(sumVector(entrywisemulVector(Ginv1, s) ));
			w = mulScalarVector(A, Ginv1 );

			XactiveT = getRows(Xt, activeset);
			var u = mulMatrixVector(transposeMatrix(XactiveT), w);

		}

		// Compute gamma

		if ( activeset.length < d ) {
			gamma = Infinity;
			var a = zeros(d);
			for ( k=0; k < d; k++) {
				if ( inactiveset[k] == 1 ) {
					a[k] = dot(Xt.row(k), u);
					var g1 = (C - correlations[k]) / (A - a[k]);
					var g2 = (C + correlations[k]) / (A + a[k]);
					if ( g1 > EPS && g1 < gamma)
						gamma = g1;
					if ( g2 > EPS && g2 < gamma)
						gamma = g2;
				}
			}
		}
		else {
			// take a full last step
			gamma = C / A;
		}

		// LASSO modification
		if ( method == "lasso") {
			drop = -1;
			for ( k=0; k < activeset.length-1; k++) {
				var gammak = -beta[activeset[k]] / w[k] ;
				if ( gammak > EPS && gammak < gamma ) {
					gamma = gammak;
					drop = k;
				}
			}
		}

		// Update beta
		if ( activeset.length > 1 ) {
			for ( var j=0; j < activeset.length; j++) {
				beta[activeset[j]] += gamma * w[j];
			}
		}
		else
			beta[activeset[0]] += gamma * w;

		// LASSO modification
		if ( drop != -1 ) {
			console.log("LARS/Lasso dropped variable " + activeset[drop] );
			// drop variable
			inactiveset[activeset[drop]] = 1;
			beta[activeset[drop]] = 0; // should already be zero
			activeset.splice(drop, 1);
			// downdate cholesky factorization
			R = downdateR(drop, R.R, R.rank);

			XactiveT = getRows(Xt,activeset);

			// increase total number steps to take (lasso does not terminate in d iterations)
			maxiters++;
			betas = appendRow ( betas );
		}

		// compute bias = meanY - dot(meanX, betascaled)
		var betascaled = zeros(d+1);
		var bias = meanY;
		for ( var j=0; j < activeset.length; j++) {
			k = activeset[j];
			betascaled[k] = beta[k] / normX[k];
			bias -= betascaled[k] * meanX[k];
		}
		betascaled[d] = bias;

		// save beta including rescaling and bias
		setRows(betas,[iter], betascaled);

		if ( iter < maxiters ) {
			// update residuals for next step
			for ( k=0; k < N; k++)
				r[k] -= gamma * u[k];

			// and update correlations
			if ( drop != -1 ) {
				// recompute correlations from scratch due drop
				correlations = mulMatrixVector(Xt,r);
			}
			else {
				for ( k=0; k < d; k++) {
					if ( inactiveset[k] == 1 ) {
						correlations[k] -= gamma * a[k];
					}
				}
			}
		}

		iter++;
	} while ( activeset.length < d && iter <= maxiters );

	lambda = new Float64Array(lambda); // make it a vector;


	// return only the computed part of the path + bias term
	if ( iter < betas.m ) {
		betas = transposeMatrix(new Matrix(iter, betas.n, betas.val.subarray(0,betas.n*iter), true));
		return betas;
	}
	else {
		betas = transposeMatrix(betas);
		return betas;
	}
}

/***********************************
	Orthogonal Least Squares (OLS)

	(also known as greedy approach to compresed sensing,
	forward stagewise regression, modification of OMP... )

	Find a sparse solution to X*w = y by starting with w=0

	Then, at each step, select the index k of the variable that minimizes
	min_w || Y - X_k w||
	where X_k is made of the subset of columns of X previously selected
	plus the kth column.

************************************/
function OLS ( params) {
	var that = new Regression ( OLS, params);
	return that;
}
OLS.prototype.construct = function ( params ) {
	// Read this.params and create the required fields for a specific algorithm

	// Default parameters:

	this.epsilon = "auto";
	this.dimension = "auto";
	this.affine = true;

	// Set parameters:
	var i;
	if ( params) {
		for (i in params)
			this[i] = params[i];
	}
}

OLS.prototype.train = function (X, y) {

	const N = X.m;
	const n = X.n;

	var Xreg;
	if (this.affine)
		Xreg = mat([X,ones(N)]);
	else
		Xreg = X;

	var epsilon ;
	var nmax ;

	if ( this.epsilon == "auto" )
		epsilon = sumVector( entrywisemulVector(y, y) ) * 0.001; // XXX
	else
		epsilon = this.epsilon;


	if  (this.dimension == "auto")
		nmax = n;
	else
		nmax = this.dimension;		// predefined dimension...


	const epsilon2 = epsilon * epsilon;

	var S = [];
	var notS = range(n);

	var err = Infinity;

	var i,j,k;
	var residual;
	while ( (err > epsilon2) && (S.length < nmax) ) {

		// For each variable not in support of solution (S),
		//	minimize the error with support = S + this variable
		var e = zeros(notS.length);

		i=0;
		var besti = -1;
		err = Infinity;

		while (i < notS.length && err > epsilon2) {
			j = notS[i];

			var Sj = [];
			for (k=0; k < S.length; k++)
				Sj.push(S[k]);
			Sj.push(j);

			if ( this.affine )
				Sj.push(n);

			var XS = getCols(Xreg, Sj );

			var x_j = solve(XS , y);	// use cholesky updating???

			if (typeof(x_j) != "number")
				residual = subVectors(mulMatrixVector( XS , x_j) , y);
			else
				residual = subVectors(mulScalarVector( x_j, XS) , y);

			for ( k=0; k < N; k++)
				e[i] += residual[k] * residual[k] ;

			// Find best variable with minimum error
			if ( e[i] < err ) {
				err = e[i];
				besti = i;
			}

			i++;
		}

		// add variable to support of solution
		S.push( notS[besti]);
		notS.splice(besti, 1);
	}

	var Sj = [];
	for (k=0; k < S.length; k++)
		Sj.push(S[k]);
	if ( this.affine )
		Sj.push(n);

	XS = getCols(Xreg, Sj );
	var xhat = zeros(n + (this.affine?1:0),1);
	x_j = solve(XS , y);
	set(xhat, Sj, x_j);
	if (typeof(x_j) != "number")
		residual = subVectors(mulMatrixVector( XS , x_j) , y);
	else
		residual = subVectors(mulScalarVector( x_j, XS) , y);
	err = 0;
	for ( k=0; k < N; k++)
		err += residual[k] * residual[k] ;

	if ( this.affine ) {
		this.w = get(xhat,range(n));
		this.b = xhat[n];
	}
	else
		this.w = xhat;

	this.support = S;
	return err;
}

//////////////////////////////////////////////////
/////	Multi-Layer Perceptron for regression (MLPreg)
///////////////////////////////////////////////////
function MLPreg ( params) {
	var that = new Regression ( MLPreg, params);
	return that;
}
MLPreg.prototype.construct = function (params) {

	// Default parameters:

	this.loss = "squared";
	this.hidden = 5;
	this.epochs = 1000;
	this.learningRate = 0.01;
	this.initialweightsbound = 0.1;


	this.normalization = "auto";

	// Set parameters:
	var i;
	if ( params) {
		for (i in params)
			this[i] = params[i];
	}

	// Parameter grid for automatic tuning:
	this.parameterGrid = {hidden: [5,10,15,30]};
}
MLPreg.prototype.train = function (Xorig, y) {
	// Training function
	if ( this.loss !="squared" )
		return "loss not implemented yet.";

 	//  normalize data
	if ( this.normalization != "none"  ) {
		var norminfo = normalize(Xorig);
		this.normalization = {mean: norminfo.mean, std: norminfo.std};
		var X = norminfo.X;
	}
	else {
		var X = Xorig;
	}

	const N = size(X,1);
	const d = size(X,2);

	const minstepsize = Math.min(epsilon, 0.1 / ( Math.pow( 10.0, Math.floor(Math.log(N) / Math.log(10.0))) ) );

	var epsilon = this.learningRate;
	const maxEpochs = this.epochs;

	const hls = this.hidden;

	var h;
	var output;
	var delta;
	var delta_w;
	var xi;
	var index;
	var k;

	/* Initialize the weights */

	if ( d > 1 )
		var Win = mulScalarMatrix( this.initialweightsbound, subMatrixScalar( rand(hls, d), 0.5 ) );
	else
		var Win = mulScalarVector( this.initialweightsbound, subVectorScalar( rand(hls), 0.5 ) );

	var Wout = mulScalarVector( this.initialweightsbound, subVectorScalar( rand(hls), 0.5 ) );

	var bin = mulScalarVector( this.initialweightsbound/10, subVectorScalar( rand(hls), 0.5 ) );
	var bout = (this.initialweightsbound/10) * (Math.random() - 0.5) ;

	var cost = 0;
	for(var epoch = 1; epoch<=maxEpochs; epoch++) {

		if( epoch % 100 == 0)
			console.log("Epoch " + epoch, "Mean Squared Error: " + (cost/N));

		if(epsilon >= minstepsize)
			epsilon *= 0.998;

		var seq = randperm(N); // random sequence for stochastic descent

		cost = 0;
		for(var i=0; i < N; i++) {
			index = seq[i];

			/* Hidden layer outputs h(x_i) */
			if ( d > 1 ) {
				xi = X.row( index );
				h =  tanh( addVectors( mulMatrixVector(Win, xi), bin ) );
			}
			else
				h =  tanh( addVectors( mulScalarVector(X[index] , Win), bin ) );

			/* Output of output layer g(x_i) */
			output =  dot(Wout, h) + bout ;

			var e = output - y[index];
			cost += e * e;

			/* delta_i for the output layer derivative dJ_i/dv = delta_i h(xi) */
			delta = e ;

			/* Vector of dj's in the hidden layer derivatives dJ_i/dw_j = dj * x_i */
			delta_w = mulScalarVector(delta, Wout);

			for(k=0; k < hls; k++)
				delta_w[k] *=  (1.0 + h[k]) * (1.0 - h[k]); // for tanh units

			/* Update weights of output layer: Wout = Wout - epsilon * delta * h */
			saxpy( -epsilon*delta, h, Wout);
			/*
			for(var j=0; j<hls; j++)
				Wout[j] -= epsilon * delta * h[j];*/

			/* Update weights of hidden layer */
			if ( d > 1 ) {
				var rk = 0;
				for(k=0; k<hls; k++) {
					var epsdelta = epsilon * delta_w[k];
					for(j=0; j<d; j++)
						Win.val[rk + j] -= epsdelta * xi[j];
					rk += d;
				}
			}
			else {
				saxpy( -epsilon * X[index], delta_w, Win);
				/*
				for(k=0; k<hls; k++)
					Win[k] -= epsilon * delta_w[k] * X[index];
					*/
			}

			/* Update bias of both layers */
			saxpy( -epsilon, delta_w, bin);
			/*
			for(k=0; k<hls; k++)
			  bin[k] -= epsilon * delta_w[k]; */

			bout -= epsilon * delta;
		}
	}

	this.W = Win;
	this.V = Wout;
	this.w0 = bin;
	this.v0 = bout;
	this.dim_input = d;

	return cost;
}

MLPreg.prototype.predict = function( x_unnormalized ) {
	// normalization
	var x;
	if (typeof(this.normalization) != "string" )
		x = normalize(x_unnormalized, this.normalization.mean, this.normalization.std);
	else
		x = x_unnormalized;

	// prediction

	var i;
	var k;
	var output;

	var tx = type(x);

	if ( (tx == "vector" && this.dim_input > 1) || (tx == "number" && this.dim_input == 1) ) {

		/* Output of hidden layer */
		if ( this.dim_input > 1 )
			var hidden = tanh( addVectors( mulMatrixVector(this.W, x), this.w0 ) );
		else
			var hidden = tanh( addVectors( mulScalarVector(x, this.W), this.w0 ) );

		/* Output of output layer */
		var output = dot(this.V, hidden) + this.v0 ;
		return output;
	}
	else if ( tx == "matrix" || (tx == "vector" && this.dim_input == 1)) {
		output = zeros(x.length);
		for ( i=0; i < x.length; i++) {
			/* output of hidden layer */
			if ( this.dim_input > 1 )
				var hidden = tanh( addVectors( mulMatrixVector(this.W, x.row(i)), this.w0 ) );
			else
				var hidden = tanh( addVectors( mulScalarVector(x[i], this.W), this.w0 ) );

			/* output of output layer */
			output[i] = dot(this.V, hidden) + this.v0 ;
		}
		return output;
	}
	else
		return "undefined";
}

/************************************************
	Generic class for Switching Regression

	i.e., problems with multiple models that must be
	estimated simultaneously: we assume that

	 y_i = x_i'w_j + noise

	with unknown j.
*************************************************/


function SwitchingRegression (algorithm, params ) {

	if ( typeof(algorithm) == "undefined" ) {
		var algorithm = kLinReg;
	}

	this.algorithm = algorithm.name;
	this.userParameters = params;

	// Functions that depend on the algorithm:
	this.construct = algorithm.prototype.construct;

	this.train = algorithm.prototype.train;
	if (  algorithm.prototype.predict )
		this.predict = algorithm.prototype.predict; // otherwise use default function for linear model

	// Initialization depending on algorithm
	this.construct(params);
}

SwitchingRegression.prototype.construct = function ( params ) {
	// Read this.params and create the required fields for a specific algorithm

	// Default parameters:

	this.affine = true;

	// Set parameters:
	var i;
	if ( params) {
		for (i in params)
			this[i] = params[i];
	}

}

SwitchingRegression.prototype.tune = function ( X, y, Xv, yv ) {
	// Main function for tuning an algorithm on a given data set

	/*
		1) apply cross validation to estimate the performance of all sets of parameters
			in this.parameterGrid

			- for each cross validation fold and each parameter set,
					create a new model, train it, test it and delete it.

		2) pick the best set of parameters and train the final model on all data
			store this model in this.*
	*/
}

SwitchingRegression.prototype.train = function (X, y) {
	// Training function: should set trainable parameters of the model
	//					  and return the training error.


	// Return training error:
	return this.test(X, y);

}

SwitchingRegression.prototype.predict = function (x, mode) {
	// Prediction function (default for linear model)

	var Y;
	const tx = type(x);
	const tw = type(this.W);

	if ( (tx == "vector" && tw == "matrix") || (tx == "number" && tw == "vector") ) {
		// Single prediction
		Y = mul(this.W, x);
		if ( this.affine  && this.b)
			Y = add(Y, this.b);

		if ( typeof(mode) == "undefined" )
			return Y;
		else
			return Y[mode];
	}

	else {
		// multiple predictions
		if ( size(x, 2) == 1 ) {
			// one-dimensional case
			Y = outerprod(x, this.W);
		}
		else {
			Y = mul( x, transpose(this.W));
		}

		if ( this.affine  && this.b)
			Y = add(Y, outerprod(ones(Y.length), this.b));

		var tmode = typeof(mode);
		if ( tmode == "undefined" ) {
			// No mode provided, return the entire prediction matrix Y = [y1, y2, ... yn]
			return Y;
		}
		else if (tmode == "number")  {
			// output of a single linear model
			return getCols(Y, [mode]);
		}
		else {
			// mode should be a vector
			// return y = [.. y_i,mode(i) ... ]
			var y = zeros( Y.length ) ;

			var j;
			var idx;
			for ( j=0; j< this.n; j++) {
				idx = find(isEqual(mode, j));

				set(y, idx, get(Y,idx, j) );
			}

			return y;
		}

	}

}

SwitchingRegression.prototype.test = function (X, y) {
	// Test function: return the mean squared error (use this.predict to get the predictions)
	var prediction = this.predict( X ) ;	// matrix

	var i;
	var errors = 0;
	var ei;
	if ( type(y) == "vector") {
		for ( i=0; i < y.length; i++) {
			ei = sub(prediction[i],  y[i]);
			errors += min( entrywisemul(ei, ei) ) ;
		}
		return errors/y.length; // javascript uses floats for integers, so this should be ok.
	}
	else {
		ei = sub(prediction,  y);
		return  min( entrywisemul(ei, ei));
	}
}

SwitchingRegression.prototype.mode = function (X, y) {
	// Test function: return the estimated mode for all rows of X
	var prediction = this.predict( X ) ;	// matrix

	if ( type(prediction) == "vector") {
		return argmin(prediction);
	}
	else {
		var mode =zeros(X.length);
		for (var i=0; i < y.length; i++) {
			ei = sub(prediction.row(i),  y[i]);
			mode[i] = argmin( abs(ei) ) ;
		}
		return mode; // javascript uses floats for integers, so this should be ok.
	}
}




SwitchingRegression.prototype.info = function () {
	// Print information about the model

	var str = "{<br>";
	var i;
	var Functions = new Array();
	for ( i in this) {
		switch ( type( this[i] ) ) {
			case "string":
			case "boolean":
			case "number":
				str += i + ": " + this[i] + "<br>";
				break;
			case "vector":
				if (  this[i].length <= 5 ) {
					str += i + ": [ " ;
					for ( var k=0; k < this[i].length-1; k++)
						str += this[i][k] + ", ";
 					str += this[i][k] + " ]<br>";
				}
				else
					str += i + ": vector of size " + this[i].length + "<br>";
				break;
			case "matrix":
				str += i + ": matrix of size " + this[i].m + "-by-" + this[i].n + "<br>";
				break;
			case "function":
				Functions.push( i );
				break;
			default:
				str += i + ": " + typeof(this[i]) + "<br>";
				break;
		}
	}
	str += "<i>Functions: " + Functions.join(", ") + "</i><br>";
	str += "}";
	return str;
}
/**********************************
	 K-LinReg

	algorithm for switching regression from
	Lauer, Nonlinear Analysis: Hybrid System, 2013.
***********************************/
function kLinReg ( params) {
	var that = new SwitchingRegression ( kLinReg, params);
	return that;
}
kLinReg.prototype.construct = function ( params ) {
	// Read this.params and create the required fields for a specific algorithm

	// Default parameters:

	this.affine = true;
	this.n = 2;	// number of modes;
	this.restarts = 100;

	// Set parameters:
	var i;
	if ( params) {
		for (i in params)
			this[i] = params[i];
	}

}
kLinReg.prototype.train = function (X, y) {
	// Training function: should set trainable parameters of the model
	//					  and return the training error.

	var Xreg;
	if ( this.affine)
		Xreg = mat([X, ones(X.length)]);
	else
		Xreg = X;

	const n = this.n;
	const N = y.length;
	const d = size(Xreg, 2);
	const restarts = this.restarts;

	var W; // n by d matrix of parameters
	var Y = outerprod(y, ones(n)); // Y = [y, y,..., y]
	var E;
	var E2;
	var inModej;
	var idxj;
	var lbls = zeros(N);
	var i;
	var j;

	var bestW;
	var bestlbls;
	var min_mse = Infinity;
	var mse;

	var restart;

	for (restart = 0; restart < restarts; restart++) {
		// Init random param uniformly
		W = sub(mul(20,rand(n,d)) , 10);

		err = -1;
		do {
			// Classify
			E = sub(Y , mul(Xreg,transpose(W) ) );
			E2 = entrywisemul(E, E);

			for ( i=0; i< N; i++) {
				lbls[i] = argmin( E2.row(i) ) ;
			}

			// compute parameters
			err_prec = err;
			err = 0;
			for (j=0; j < n ; j++) {
				inModej = isEqual(lbls,j);
				if (sumVector(inModej) > d ) {
					idxj = find(inModej);
					if ( d > 1 )
						W.row(j).set(solve( getRows(Xreg, idxj) , getSubVector(y, idxj) ) );
					else
						W[j] = solve( getSubVector(Xreg, idxj) , getSubVector(y, idxj) ) ;

					err += sum ( get(E2, idxj, j) );
				}
				else {
					err = Infinity;
					break;
				}
			}

		} while ( ( err_prec < 0 || err_prec > err + 0.1 ) && err > EPS );

		mse = err / N;
		if(  mse < min_mse) {
			bestW = matrixCopy(W);
			bestlbls = vectorCopy(lbls);
			min_mse = mse;
		}
	}

	if ( this.affine ) {
		this.W = get(bestW, [], range(d-1));
		this.b = get(bestW, [], d-1);
	}
	else {
		this.W = bestW;
		if ( this.b )
			delete( this.b);
	}

	return min_mse;
}

///////////////////////////
//// tools
///////////////////////////


/**
 * Normalize the columns of X to zero mean and unit variance for dense X
 			return X for sparse X
 */
function normalize( X, means, stds ) {
	var tX = type(X);
	if ( arguments.length < 3 ) {
		if ( tX == "spvector" || tX == "spmatrix" )
			return {X: X, mean: NaN, std: NaN};

		var m = mean(X,1);
		var s = std(X,1);
		if ( typeof(s) != "number" ) {
			for ( var j=0; j < s.val.length; j++) {
				if( isZero(s.val[j]) )	// do not normalize constant features
					s.val[j] = 1;
			}
		}
		var Xn = entrywisediv( sub(X, mul(ones(X.length),m)), mul(ones(X.length),s) );
		if ( m ) {
			if ( typeof(m) == "number" )
				return {X: Xn, mean: m, std: s};
			else
				return {X: Xn, mean: m.val, std: s.val};
		}
		else
			return Xn;
	}
	else {
		if ( tX == "spvector" || tX == "spmatrix" )
			return X;

		if (tX != "matrix"){
			// X: single vector interpreted as a data row
			return entrywisediv( sub(X,means), stds);
		}
		else {
			// X: matrix to normalize
			return entrywisediv( sub(X, outerprod(ones(X.length),means)), outerprod(ones(X.length),stds) );
		}
	}
}
/**
 * return an object {X: Matrix, y: vector} of AR regressors and outputs for time series prediction
 * @param {Float64Array}
 * @param {number}
 * @return {Object: {Matrix, Float64Array} }
 */
function ar( x, order ) {
	var i,j,k;
	if ( typeof(order) == "undefined")
		var order = 1;

	var X = new Matrix ( x.length - order , order );

	var y = zeros(x.length - order);

	k = 0;
	for ( i=order; i < x.length; i++) {
		for ( j=1; j <= order; j++) {
			X.val[k] = x[i-j];
			k++;
		}
		y[i-order] = x[i];
	}

	return {X: X, y: y};
}
////////////////////////////////////////////
///	Clustering functions for the ML.js library
/////////////////////////////////////////////

/****************************************
		Spectral clustering

	Implemented as in Ng. et al, NIPS, 2002

	Possible affinity functions (choose via type of sigma):
	- Gaussian RBF (default) (sigma is the bandwidth)
	- custom function (sigma) computing affinity between two points
	- custom affinity matrix (sigma) computed elsewhere
*****************************************/
function spectralclustering ( X , n, sigma ) {
	const N = X.length;
	switch( type(sigma) ) {
		case "undefined":
			var A = kernelMatrix(X, "rbf", 1) ; // Affinity Matrix with sigma = 1 by default
			break;
		case "number":
			var A = kernelMatrix(X, "rbf", sigma) ; // Affinity Matrix
			break;
		case "matrix":
			var A = sigma ; // custom Affinity Matrix provided
			break;
		case "function":
			// custom Affinity function provided
			var A = zeros(N,N);
			for ( var i = 1; i< N; i++) {
				for ( var j=0; j<i; j++) {
					A.val[i*A.n + j] = sigma(X.row(i), X.row(j));
					A.val[j*A.n + i] = A.val[i*A.n + j];
				}
			}
			break;
		default:
			return "Invalid 3rd parameter value.";
			break;
	}

	if ( typeof(sigma) != "function")
		A = sub(A, diag(diag(A))) ; // zero diagonal of A

	// normalize  as in A. Ng et al., 2002:
	var D = sum(A, 2);
	var D2 = spdiag(entrywisediv(1, sqrt(D))); // diag(D)^(-1/2);
	var Ap = mul(D2, mul(A, D2));

	/*
	// Shi-Malik:
	// in place A <- L = D^-1 A  (should be I - D^-A , but we use largest egienvalues instead of smallest)
	for ( var i=0; i < N; i++) {
		for ( var j=0; j < N; i++)
			A.val[i*A.n + j] /= D[i];
	}
	*/

	// find eigenvectors
	var eigen = eigs(Ap,n);


    // Normalize rows of U
    var i;
    var U = matrixCopy(eigen.U);
    var normU = norm(U,2);
	for ( i=0; i< U.m ; i++) {
		for ( var j=0; j < U.n; j++)
			U.val[i*U.n+j] /= normU[i];
 	}

 	// Kmeans clustering
	var labels = kmeans(U , n).labels;
	return labels;
}

/**************************************
		K-means

	- including multiple random restarts
	- exact algorithm for dim(x_i) = 1 tests all linear cuts
		(if X is a vector instead of a matrix)

***************************************/
function kmeans(X, n, restarts) {

	if ( type ( X) == "vector") {
		// Exact algorithm for one-dimensional data:
		return kmeansexact1D(X, n, 0);
	}

	if ( typeof(n) == "undefined" ) {
		// Determine number of clusters using cluster separation measure
		var nmax = 10;
		var validity = new Float64Array(nmax+1);
		validity[0] = Infinity;
		validity[1] = Infinity;
		var n;
		var clustering = new Array(nmax+1);
		for ( n=2; n <= nmax; n++) {
			clustering[n] = kmeans(X,n,restarts);
			validity[n] = clusterseparation(X,clustering[n].centers,clustering[n].labels);
		}
		var best_n = findmin(validity);
		// go on increasing n while getting better results
		while ( best_n == nmax ) {
			nmax++;
			clustering[nmax] = kmeans(X,nmax,restarts);
			validity[nmax] = clusterseparation(X,clustering[n].centers,clustering[n].labels);
			if ( validity[nmax] < validity[best_n] )
				best_n = nmax;
		}
		console.log("Clustering validity intra/inter = " , validity, "minimum is at n = " + best_n);

		return clustering[best_n];
	}

	if( typeof(restarts) == "undefined" ) {
		var restarts = 100;
	}

	// box bounds for centers:
	var minX = transpose(min(X,1));
	var maxX = transpose(max(X,1));

	// do multiple kmeans restarts
	var r;
	var res = {};
	res.cost = Infinity;
	var clustering;
	for ( r=0; r<restarts; r++) {
		clustering = kmeans_single(X, n, minX, maxX); // single shot kmeans

		if ( clustering.cost < res.cost ) {
			res.labels = vectorCopy(clustering.labels);
			res.centers = matrixCopy(clustering.centers);
			res.cost = clustering.cost
		}
	}

	return res;
}

function kmeans_single(X, n, minX, maxX ) {
	var i;
	var j;
	var k;

	const N = X.m;
	const d = X.n;

	if ( typeof(minX) == "undefined")
		var minX = transpose(min(X,1));
	if( typeof(maxX) == "undefined")
		var maxX = transpose(max(X,1));

	var boxwidth = sub(maxX, minX);

	// initialize centers:
	var centers = zeros(n,d); // rand(n,d);
	for ( k=0; k < n; k++) {
		set(centers, k, [], add( entrywisemul(rand(d), boxwidth) , minX) );
	}

	var labels = new Array(N);
	var diff;
	var distance = zeros(n);
	var Nk = new Array(n);
	var normdiff;
	var previous;
	var updatecenters = zeros(n,d);
	do {
		// Zero number of points in each class
		for ( k=0; k< n; k++) {
			Nk[k] = 0;
			for ( j=0; j<d; j++)
				updatecenters.val[k*d + j] = 0;
		}

		// Classify data
		for ( i=0; i < N; i++) {
			var Xi = X.val.subarray(i*d, i*d+d);

			for ( k=0; k < n; k++) {
				diff = sub ( Xi , centers.val.subarray(k*d, k*d+d) ) ;
				distance[k] = dot(diff,diff); // = ||Xi - ck||^2
			}
			labels[i] = findmin(distance);

			// precompute update of centers
			for ( j=0; j < d; j++)
				updatecenters.val[ labels[i] * d + j] += Xi[j];

			Nk[labels[i]] ++;
		}

		// Update centers:
		previous = matrixCopy(centers);
		for (k=0;k < n; k++) {
			if ( Nk[k] > 0 ) {
				for ( j= 0; j < d; j++)
					centers.val[k*d+j] = updatecenters.val[k*d+j] / Nk[k]  ;

			}
			else {
				//console.log("Kmeans: dropped one class");
			}
		}
		normdiff = norm( sub(previous, centers) );

	} while ( normdiff > 1e-8 );

	// Compute cost
	var cost = 0;
	for ( i=0; i < N; i++) {
		var Xi = X.val.subarray(i*d, i*d+d);
		for ( k=0; k < n; k++) {
			diff = sub ( Xi , centers.val.subarray(k*d, k*d+d) ) ;
			distance[k] = dot(diff,diff); // = ||Xi - ck||^2
		}
		labels[i] = findmin(distance);

		cost += distance[labels[i]];
	}

	return {"labels": labels, "centers": centers, "cost": cost};
}

function kmeansexact1D( X, n, start) {

	if ( n <= 1 || start >= X.length -1 ) {
		var cost = variance(get(X,range(start,X.length)));
		return {"cost":cost, "indexes": []};
	}
	else {
		var i;
		var cost;
		var costmin = Infinity;
		var mini = 0;
		var nextcut;
		for ( i= start+1; i < X.length-1; i++) {
			// cut between start and end at i :
			// cost is variance of first half + cost from the cuts in second half
			cost = variance ( get(X, range(start, i) ) ) ;
			nextcut = kmeansexact1D( X, n-1, i)
			cost += nextcut.cost ;

			if ( cost < costmin ) {
				costmin = cost;
				mini = i;
			}

		}

		var indexes = nextcut.indexes;
		indexes.push(mini);
		return {"cost": costmin, "indexes": indexes } ;
	}
}

/*
	Compute cluster separation index as in Davis and Bouldin, IEEE PAMI, 1979
	using Euclidean distances (p=q=2).

	centers has nGroups rows
*/
function clusterseparation(X, centers, labels) {
	var n = centers.m;
	var dispertions = zeros(n);
	var inter = zeros(n,n);
	for ( var k=0; k<n; k++) {
		var idx = find(isEqual(labels, k));

		if ( idx.length == 0 ) {
			return Infinity;
		}
		else if ( idx.length == 1 ) {
			dispertions[k] = 0;
		}
		else {
			var Xk = getRows(X, idx);
			var diff = sub(Xk, outerprod(ones(Xk.length), centers.row(k)));
			diff = entrywisemul(diff,diff);
			var distances = sum(diff, 2);
			dispertions[k] = Math.sqrt(sum(distances) / idx.length );
		}

		for ( j=0; j < k; j++) {
			inter.val[j*n+k] = norm(sub(centers.row(j), centers.row(k)));
			inter.val[k*n+j] = inter.val[j*n+k];
		}
	}
	var Rkj = zeros(n,n);
	for ( k=0; k < n; k++) {
		for ( j=0; j < k; j++) {
			Rkj.val[k*n+j] = ( dispertions[k] + dispertions[j] ) / inter.val[j*n+k];
			Rkj.val[j*n+k] = Rkj.val[k*n+j];
		}
	}
	var Rk = max(Rkj, 2);
	var R = mean(Rk);
	return R;
}

function voronoi (x, centers) {
	// Classify x according to a Voronoi partition given by the centers
	var t = type(x);
	if ( t == "matrix" && x.n == centers.n ) {
		var labels = new Float64Array(x.m);
		for (var i=0; i < x.m; i++) {
			labels[i] = voronoi_single(x.row(i), centers);
		}
		return labels;
	}
	else if ( t == "vector" && x.length == centers.n ) {
		return voronoi_single(x, centers);
	}
	else
		return undefined;
}
function voronoi_single(x, centers) {
	var label;
	var mindist = Infinity;
	for (var k=0; k < centers.m; k++) {
		var diff = subVectors(x, centers.row(k) );
		var dist = dot(diff,diff);
		if ( dist < mindist ) {
			mindist = dist;
			label = k;
		}
	}
	return label;
}
/*******************************
	Clustering with Stability analysis for tuning the nb of groups
	(see von Luxburg, FTML 2010)

	X: data matrix
	nmax: max nb of groups
	method: clustering function for fixed nb of groups
			(either kmeans or spectralclustering for now)
	params: parameters of the clustering function
********************************/
function cluster(X, nmax, method, params, nbSamples ) {
	var auto = false;
	if ( typeof(nmax) != "number" ) {
		var nmax = 5;
		var auto = true;
	}
	if ( typeof(nbSamples) != "number" )
		var nbSamples = 3;
	if ( typeof(method) != "function" )
		var method = kmeans;

	if ( method.name != "kmeans" ) {
		error("stability analysis of clustering only implemented for method=kmeans yet");
		return undefined;
	}

	var Xsub = new Array(nbSamples);
	var indexes = randperm(X.m);
	var subsize = Math.floor(X.m / nbSamples);
	for (var b=0; b < nbSamples ; b++ ) {
		Xsub[b] = getRows(X, get(indexes, range(b*subsize, (b+1)*subsize)));
	}

	var best_n;
	var mininstab = Infinity;
	var instab = new Array(nmax+1);

	var clusterings = new Array(nbSamples);

	var compute_instab = function ( n ) {
		for (var b=0; b < nbSamples ; b++ ) {
			clusterings[b] = method( Xsub[b], n, params);
		}

		// reorder centers and labels to match order of first clustering
		//	(otherwise distances below are subject to mere permutations and meaningless
		var orderedCenters = new Array(nbSamples);
		orderedCenters[0] = clusterings[0].centers;
		for ( var b = 1; b < nbSamples; b++) {
			var idxtemp = range(n);
			var idx = new Array(n);
			for ( var c = 0; c < n; c++) {
				var k = 0;
				var mindist = Infinity;
				for ( var c2 = 0; c2 < idxtemp.length; c2++) {
					var dist = norm(subVectors (clusterings[b].centers.row(idxtemp[c2]), clusterings[0].centers.row(c) ));
					if ( dist < mindist ) {
						mindist = dist;
						k = c2;
					}
				}
				idx[c] = idxtemp.splice(k,1)[0];
			}
			orderedCenters[b] = getRows(clusterings[b].centers, idx);
		}
		// Compute instability as average distance between clusterings

		instab[n] = 0;
		for (var b=0; b < nbSamples ; b++ ) {
			for (var b2=0; b2 < b; b2++) {
				if ( method.name == "kmeans" ) {
					for ( var i=0; i < subsize; i++) {
						instab[n] += ( voronoi_single(Xsub[b].row(i) , orderedCenters[b2] ) != voronoi_single(Xsub[b].row(i) , orderedCenters[b]) )?2:0 ; // 2 because sum should loop over symmetric cases in von Luxburg, 2010.
					}
					for ( var i=0; i < subsize; i++) {
						instab[n] += ( voronoi_single(Xsub[b2].row(i) , orderedCenters[b] ) != voronoi_single(Xsub[b2].row(i) ,orderedCenters[b2]) )?2:0 ;
					}
				}
			}
		}
		instab[n] /= (nbSamples*nbSamples);
		if ( instab[n] < mininstab ) {
			mininstab = instab[n];
			best_n = n;
		}
		console.log("For n = " + n + " groups, instab = " + instab[n] + " (best is " + mininstab + " at n = " + best_n + ")");
	};

	for ( var n = 2; n <= nmax; n++ ) {

		compute_instab(n);

		if ( isZero(instab[n]) )
			break;	// will never find a lower instab than this one
	}

	// go on increasing n while stability increases
	while ( auto && best_n == nmax && !isZero(mininstab) ) {
		nmax++;
		compute_instab(nmax);
	}

	return {clustering: method(X,best_n,params) , n: best_n, instability: instab};
}
// Generic class for Dimensionality Reduction
function DimReduction (algorithm, params ) {

	if ( typeof(algorithm) == "undefined" ) {
		var algorithm = PCA;
	}

	this.type = "DimReduction:" + algorithm.name;

	this.algorithm = algorithm.name;
	this.userParameters = params;

	// Functions that depend on the algorithm:
	this.construct = algorithm.prototype.construct;

	this.train = algorithm.prototype.train;
	if (  algorithm.prototype.reduce )
		this.reduce = algorithm.prototype.reduce; // otherwise use default function for linear model
	if (  algorithm.prototype.unreduce )
		this.unreduce = algorithm.prototype.unreduce; // otherwise use default function for linear model

	// Initialization depending on algorithm
	this.construct(params);
}

DimReduction.prototype.construct = function ( params ) {
	// Read params and create the required fields for a specific algorithm

	// Default parameters:

	this.dimension = undefined;

	// Set parameters:
	if ( typeof(params) == "number")
		this.dimension = params;
	else {
		var i;
		if ( params) {
			for (i in params)
				this[i] = params[i];
		}
	}

}

DimReduction.prototype.train = function ( X ) {
	// Training function: should set trainable parameters of the model and return reduced X
	var Xreduced;

	// Return X reduced:
	return Xreduced;
}

DimReduction.prototype.reduce = function (X) {
	// Default prediction function : apply linear dimensionality reduction to X
	if ( type(X) == "matrix") {
		var Xc = zeros(X.m, X.n);
		var i;
		for ( i=0; i< X.length; i++)
			Xc.row(i).set( subVectors(X.row(i) , this.means) );

		return mul(Xc, this.Q);
	}
	else {
		var Xc = sub(X, this.means);
		return transpose(mul(transpose(Xc), this.Q));
	}
}

DimReduction.prototype.unreduce = function (Xr) {
	// Recover (up to compression level) the original X from a reduced Xr
	if ( type(Xr) == "matrix") {
		var X = mul(Xr, transpose(this.Q));
		var i;
		var j;
		for ( i=0; i< X.length; i++)
			for(j=0; j < X.n; j++)
				X.val[i*X.n+j] += this.means[j];

		return X;
	}
	else {
		if ( this.dimension > 1 )
			return add(mul(this.Q, Xr) , this.means); // single data
		else {
			var X = outerprod(Xr, this.Q);	// multiple data in dimension 1
			var i;
			var j;
			for ( i=0; i< X.length; i++)
				for(j=0; j < X.n; j++)
					X.val[i*X.n+j] += this.means[j];
			return X;
		}
	}
}


DimReduction.prototype.info = function () {
	// Print information about the model

	var str = "{<br>";
	var i;
	var Functions = new Array();
	for ( i in this) {
		switch ( type( this[i] ) ) {
			case "string":
			case "boolean":
			case "number":
				str += i + ": " + this[i] + "<br>";
				break;
			case "vector":
				if (  this[i].length <= 5 ) {
					str += i + ": [ " ;
					for ( var k=0; k < this[i].length-1; k++)
						str += this[i][k] + ", ";
 					str += this[i][k] + " ]<br>";
				}
				else
					str += i + ": vector of size " + this[i].length + "<br>";
				break;
			case "matrix":
				str += i + ": matrix of size " + this[i].length + "-by-" + this[i].n + "<br>";
				break;
			case "function":
				Functions.push( i );
				break;
			default:
				str += i + ": " + typeof(this[i]) + "<br>";
				break;
		}
	}
	str += "<i>Functions: " + Functions.join(", ") + "</i><br>";
	str += "}";
	return str;
}

/****************************************
	Principal Component Analysis (PCA)

	reduce data to the given dimension d by

	- centering X -> Xc
	- computing d eigenvectors of Xc'Xc

	or, if d is not given or large,
	by computing the SVD of Xc.

	If d is not given, then it is the smallest d such that

	sum_i=1^d lambda_i / sum_i=1^X.n lambda_i >= energy

	where lambda_i are ordered eigenvalues of Xc'Xc

	Parameters: { dimension: integer, energy: number in (0,1) }
*****************************************/

function PCA ( params) {
	var that = new DimReduction ( PCA, params);
	return that;
}
PCA.prototype.construct = function (params) {
	// Default parameters:

	this.dimension = undefined; // automatically set by the method by default
	this.energy = 0.8;	// cumulative energy for PCA automatic tuning

	// Set parameters:
	if ( typeof(params) == "number")
		this.dimension = params;
	else {
		var i;
		if ( params) {
			for (i in params)
				this[i] = params[i];
		}
	}

}

PCA.prototype.train = function ( X ) {
	// Training function: set trainable parameters of the model and return reduced X
	var Xreduced;
	var i;

	// center X :
	this.means = mean(X, 1).val;
	var Xc = zeros(X.m, X.n);
	for ( i=0; i< X.length; i++)
		Xc.row(i).set ( subVectors(X.row(i), this.means) );

	if ( this.dimension && this.dimension < X.n / 3) {
		// Small dimension => compute a few eigenvectors
		var C = mul(transpose(Xc), Xc);	// C = X'X = covariance matrix
		var eigendecomposition = eigs(C, this.dimension);
		this.Q = eigendecomposition.U;
		this.energy = sum(eigendecomposition.V); // XXX divided by total energy!!

		Xreduced = mul(Xc, this.Q);
	}
	else {
		// many or unknown number of components => Compute SVD:
		var svdX = svd(Xc, true);
		var totalenergy = mul(svdX.s,svdX.s);

		if ( typeof(this.dimension) == "undefined" ) {
			// set dimension from cumulative energy

			var cumulativeenergy = svdX.s[0] * svdX.s[0];
			i = 1;
			while ( cumulativeenergy < this.energy * totalenergy) {
				cumulativeenergy += svdX.s[i] * svdX.s[i];
				i++;
			}
			this.dimension = i;
			this.energy = cumulativeenergy / totalenergy;
		}
		else {
			var singularvalues=  get(svdX.s, range(this.dimension));
			this.energy = mul(singularvalues,singularvalues) / totalenergy;
		}

		// take as many eigenvectors as dimension:
		this.Q = get(svdX.V, [], range(this.dimension) );

		Xreduced = mul( get(svdX.U, [], range(this.dimension)), get( svdX.S, range(this.dimension), range(this.dimension)));
	}

	// Return X reduced:
	return Xreduced;
}



/////////////////////////////////////
/// Locally Linear Embedding (LLE)
//
//	main parameter: { dimension: integer, K: number of neighbors}
/////////////////////////////////////

function LLE ( params) {
	var that = new DimReduction ( LLE, params);
	return that;
}
LLE.prototype.construct = function (params) {
	// Default parameters:

	this.dimension = undefined; // automatically set by the method by default
	this.K = undefined // auto set to min(dimension + 2, original dimension);

	// Set parameters:
	if ( typeof(params) == "number")
		this.dimension = params;
	else {
		var i;
		if ( params) {
			for (i in params)
				this[i] = params[i];
		}
	}

}

LLE.prototype.train = function ( X ) {
	// Training function: set trainable parameters of the model and return reduced X

	var i,j,k;

	const N = X.m;
	const d = X.n;

	if ( typeof(this.dimension) == "undefined")
		this.dimension = Math.floor(d/4);

	if(typeof(this.K ) == "undefined" )
		this.K = Math.min(d, this.dimension+2);

	const K = this.K;

	// Compute neighbors and weights Wij
	var I_W = eye(N); // (I-W)
	var neighbors;

	for ( i= 0; i < N; i++) {
		neighbors = getSubVector(knnsearch(K+1, X.row(i), X).indexes, range(1,K+1)); // get K-NN excluding the point Xi

		// matrix G
		var G = zeros(K,K);
		for (j=0; j < K; j++) {
			for ( k=0; k < K; k++) {
				G.val[j*K+k] = dot(subVectors(X.row(i) , X.row(neighbors[j])),subVectors(X.row(i) , X.row(neighbors[k])));
			}
		}

		// apply regularization?
		if ( K > d ) {
			const delta2 = 0.01;
			const traceG = trace(G);
			var regul = delta2 / K;
			if ( traceG > 0 )
				regul *= traceG;

			for (j=0; j < K; j++)
				G.val[j*K+j] += regul;
		}

		var w = solve(G, ones(K));

		// rescale w and set I_W = (I-W):
		var sumw = sumVector(w);
		var ri = i*N;
		for ( j=0; j < K; j++)
			I_W.val[ri + neighbors[j] ] -= w[j] / sumw;
	}

	var usv = svd(I_W, "V"); // eigenvectors of M=(I-W)'(I-W) are singular vectors of (I-W)
	var Xreduced = get(usv.V, [], range(N-this.dimension-1, N-1) ); // get d first eigenvectors in the d+1 last (bottom) eigenvectors

	/* should do this faster as below, but eigs fails due to difficulties with inverse iterations to yield orthogonal eigenvectors for the bottom eigenvalues that are typically very close to each other

	var M = xtx(I_W);
	var Xreduced = get(eigs(M, this.dimension+1, "smallest").U, [], range( this.dimension) ); // get d first eigenvectors in the d+1 last (bottom) eigenvectors
	*/

	// Set model parameters
	this.W = I_W; // XXX

	// Return X reduced:
	return Xreduced;
}

////////////////////////////////
// LTSA: Local Tangent Space Alignment
///////////////////////////////
function ltsa( X , dim, K ) {
	const N = X.m;
	const d = X.n;

	if ( typeof(K) == "undefined")
		var K = 8;

	var B = zeros(N, N);
    var usesvd = (K > d);
	var neighbors;
	var U;
    for (var i=0; i < N; i++) {
   		neighbors = knnsearchND(K+1,X.row(i), X).indexes;
		var Xi = getRows(X, neighbors );

        Xi = sub( Xi, mul(ones(K+1), mean(Xi,1)) );

        // Compute dim largest eigenvalues of Xi Xi'
		if (usesvd)
    	    U = getCols(svd(Xi, "thinU").U, range(dim));
	    else
	        U = eigs(mulMatrixMatrix(Xi,transposeMatrix(Xi)) , dim);

        Gi = zeros(K+1, dim+1);
        set(Gi, [], 0, 1/Math.sqrt(K+1));
        set(Gi, [], range(1,Gi.n), U);

        GiGit = mulMatrixMatrix(Gi, transposeMatrix(Gi));
        // local sum into B
        for ( var j=0; j < K+1; j++) {
        	for ( var k=0; k < K+1; k++)
        		B.val[neighbors[j]*N + neighbors[k]] -= GiGit.val[j*(K+1)+k];
        	B.val[neighbors[j]*N + neighbors[j]] += 1;
        }
	}
	var usv = svd(B, "V"); // eigenvectors of B are also singular vectors...
	var Xreduced = get(usv.V, [], range(N-dim-1, N-1) ); // get d first eigenvectors in the d+1 last (bottom) eigenvectors
	return Xreduced;
}

//////////////////////////
/// General tools
/////////////////////////
/** compute the distance matrix for the points
 *  stored as rows in X
 * @param {Matrix}
 * @return {Matrix}
 */
function distanceMatrix( X ) {
	const N = X.m;
	var i,j;
	var D = zeros(N,N);
	var ri = 0;
	var Xi = new Array(N);
	for ( i=0; i<N; i++) {
		Xi[i] = X.row(i);
		for ( j=0; j < i; j++) {
			D.val[ri + j] = norm(subVectors(Xi[i], Xi[j]));
			D.val[j*N + i] = D.val[ri + j];
		}
		ri += N;
	}
	return D;
}
/*
	TO DO:
		- libsvm model multiclass
		- load msvmpack model
		- load msvmpack data

*/

///////////////////////////////////////////
/// Utilities for loading standard ML models and data
//////////////////////////////////////////
function loadmodel ( url, format ) {

	// load a remote file (from same web server only...)
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, false); // false = synchronous
	xhr.responseType = 'blob';
	xhr.send(null);

	var blob = new Blob([xhr.response]);
  	var reader = new FileReaderSync();

	if ( arguments.length < 2 )
		var format = "";

  	switch( format.toLowerCase() ) {
  	case "msvmpack":
  		return readMSVMpack(reader.readAsText(blob) );
  		break;
  	case "libsvm":
  	default:
  		return readLibSVM(reader.readAsText(blob) );
  		break;
  	}

}

function loaddata ( url, format ) {

	// load a remote file (from same web server only...)
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, false); // false = synchronous
	xhr.responseType = 'blob';
	xhr.send(null);

	var blob = new Blob([xhr.response]);
  	var reader = new FileReaderSync();

	if ( arguments.length < 2 )
		var format = "";
  	switch( format.toLowerCase() ) {
  	case "msvmpack":
  		return undefined;
  		break;
  	case "libsvm":
  		return readLibSVMdata(reader.readAsText(blob) );
  		break;
  	default:
  		// Matrix text format
  		return load_data( reader.readAsText(blob) );
  		break;
  	}

}

function load_data ( datastring ) {
	// convert a string into a matrix data
	var i,j;
	var row;
	var rows = datastring.split("\n");
	if ( rows[rows.length-1] == "" )
		rows.splice(rows.length-1,1);
	var ri ;
	var rowdata;
	ri = removeFirstSpaces(rows[0]);
	row = ri.replace(/,/g," ").replace(/ +/g,",");
	rowdata = row.split(",");
	const m = rows.length;
	const n = rowdata.length;
	var X = zeros(m, n);

	var k = 0;
	for ( i=0; i< m; i++) {
		ri = removeFirstSpaces(rows[i]);
		if ( ri != "" ) {
			row = ri.replace(/,/g," ").replace(/ +/g,",");
			rowdata = row.split(",");
			for (j=0;j<n; j++) {
				X.val[k] = parseFloat(rowdata[j]);
				k++;
			}
		}
	}
	return X;
}

function readLibSVM ( str ) {
	// read a libSVM model from a string (coming from a text file for instance)

	// by default libSVM implements one-vs-one decomposition of multi-class problems;

	const svm_type_table = ["c_svc","nu_svc","one_class","epsilon_svr","nu_svr"];
	const kernel_type_table = [ ["linear","polynomial","rbf","sigmoid","precomputed"], ["linear","poly","rbf",undefined,undefined]];

	var rows = str.split("\n");

	var i =0;
	while (rows[i] != "SV" && i < rows.length) {
		console.log(rows[i]);
		if(rows[i].indexOf("svm_type")==0) {
			var svm_type_str = rows[i].split(" ")[1];
			if ( svm_type_str != "c_svc" )
				return undefined; 						// for now...
		}
		else if(rows[i].indexOf("kernel_type")==0) {
			var kertype_str = rows[i].split(" ")[1];
			var kerneltype = kernel_type_table[1][kernel_type_table[0].indexOf(kertype_str)];
		}
		else if(rows[i].indexOf("degree")==0)
			var kernelpar = parseInt(rows[i].split(" ")[1]);
		else if(rows[i].indexOf("gamma")==0)
			var kernelpar = Math.sqrt(1 / (2 * parseFloat(rows[i].split(" ")[1]) ) );
		else if(rows[i].indexOf("coef0")==0)  {
			if ( kerneltype =="poly" && parseFloat(rows[i].split(" ")[1]) == 0 )
				kerneltype = "polyh";
		}
		else if(rows[i].indexOf("nr_class")==0)
			var Nclasses = parseInt(rows[i].split(" ")[1]);
		else if(rows[i].indexOf("total_sv")==0) {
		}
		else if( rows[i].indexOf("rho")==0) {
			var rhostr = rows[i].split(" ");
			if (rhostr.length > 2 ) {
				var rho = new Float64Array(rhostr.length - 1 );
				for (var k=1; k < rhostr.length; k++)
					rho[k-1] = parseFloat(rhostr[k]);
			}
			else
				var rho = parseFloat(rhostr[1]);
		}
		else if(rows[i].indexOf("label")==0) {
			var lblstr = rows[i].split(" ");
			var labels = new Array(Nclasses);
			for(var k=0;k<Nclasses;k++)
				labels[k] = parseInt(lblstr[k+1]);
		}
/*		else if(strcmp(cmd,"probA")==0)
		{
			int n = model->nr_class * (model->nr_class-1)/2;
			model->probA = Malloc(double,n);
			for(int i=0;i<n;i++)
				fscanf(fp,"%lf",&model->probA[i]);
		}
		else if(strcmp(cmd,"probB")==0)
		{
			int n = model->nr_class * (model->nr_class-1)/2;
			model->probB = Malloc(double,n);
			for(int i=0;i<n;i++)
				fscanf(fp,"%lf",&model->probB[i]);
		}
*/
		else if(rows[i].indexOf("nr_sv")==0) {
			var nSVstr = rows[i].split(" ");
			var nSV = new Array(Nclasses);
			for(var k=0;k<Nclasses;k++)
				nSV[k] = parseInt(nSVstr[k+1]);
		}
		i++;
	}
	i++; // skip "SV" line

	// read sv_coef and SV
	var Nclassifiers = 1;
	if ( Nclasses > 2 ) {
		Nclassifiers = Math.round(Nclasses*(Nclasses-1)/2);

		var alpha = new Array(Nclassifiers);
		var SV = new Array(Nclassifiers);
		var SVlabels = new Array(Nclassifiers);
		var SVindexes = new Array(Nclassifiers);
	}
	else {
		var totalSVs = sumVector(nSV);
		var alpha = zeros(totalSVs);
		var SV = new Array(totalSVs);
		var SVlabels = ones(totalSVs); // fake
		var SVindexes = new Array();
	}

	var SVi = 0; // counter of SVs
	var current_class = 0;
	var next_class = nSV[current_class]; // at which SVi do we switch to next class

	var dim = 1;

	while( i < rows.length && rows[i].length > 0) {
		//console.log("SV number : " + SVi);

		var row = rows[i].split(" ");

		// Read alphai * yi

		if ( Nclasses > 2 ) {
			for (var k=current_class; k < Nclasses; k++) {
				var alphaiyi = parseFloat(row[k-current_class]); // do that for all pairwise classifier involving current class

				if ( !isZero( alphaiyi ) ) {
					var kpos = current_class;
					var kneg = k-current_class+1;
					var idx = 0; // find indxe of binary classifier
					for (var t = 1; t <= kpos; t++ )
						idx += Nclasses - t;
					idx += kneg-current_class  - 1 ;

					alpha[idx].val[ SVindexes[idx].length ] = alphaiyi;
				}
			}
		}
		else {
			var alphaiyi = parseFloat(row[0]); // do that for all pairwise classifier involving current class

			if ( !isZero( alphaiyi ) ) {
				alpha[ SVindexes.length ] = alphaiyi;
				SV[SVindexes.length] = new Array(dim);
			}
		}

		// Read x_i
		var startk;
		if ( Nclasses == 2)
			startk = 1;
		else
			startk = Nclasses-current_class;
		for ( var k=startk; k < row.length; k++) {
			var indval = row[k].split(":");
			if ( indval[0].length > 0 ) {
				var featureindex = parseInt(indval[0]);
				if (featureindex > dim )
					dim = featureindex;
				featureindex--; // because libsvm indexes start at 1

				var featurevalue = parseFloat(indval[1]);

				if ( Nclasses > 2 ) {
					for (var c = current_class; c < Nclasses; c++) {
						var kpos = current_class;
						var kneg = c-current_class+1;
						var idx = 0; // find indxe of binary classifier
						for (var t = 1; t <= kpos; t++ )
							idx += Nclasses - t;
						idx += kneg-current_class  - 1 ;

						if ( alpha[idx].val[ SVindexes[idx].length ] != 0 ) {
							SV[idx][SVindexes[idx].length * dim + featureindex ] = featurevalue;

							SVlabels[idx].push(1); // fake SVlabels = 1 because alpha = alpha_i y_i

							SVindexes[idx].push(SVindexes[idx].length); // dummy index (not saved by libsvm)
						}
					}
				}
				else {
					SV[SVindexes.length][ featureindex ] = featurevalue;
				}
			}
		}
		// Make SVlabels and SVindexes
		if ( Nclasses > 2 ) {
			for (var c = current_class; c < Nclasses; c++) {
				var kpos = current_class;
				var kneg = c-current_class+1;
				var idx = 0; // find indxe of binary classifier
				for (var t = 1; t <= kpos; t++ )
					idx += Nclasses - t;
				idx += kneg-current_class  - 1 ;

				if ( alpha[idx].val[ SVindexes[idx].length ] != 0 ) {
					SVlabels[idx].push(1); // fake SVlabels = 1 because alpha = alpha_i y_i
					SVindexes[idx].push(SVindexes[idx].length); // dummy index (not saved by libsvm)
				}
			}
		}
		else
			SVindexes.push(SVindexes.length); // dummy index (not saved by libsvm)

		SVi++;
		if ( SVi >= next_class ) {
			current_class++;
			next_class += nSV[current_class];
		}


		i++;
	}

	rows = undefined; // free memory

	// Build model
	var svm = new Classifier(SVM, {kernel: kerneltype, kernelpar: kernelpar}) ;
	svm.normalization = "none";
	if (Nclasses == 2) {
		svm.labels = labels;
		svm.numericlabels = labels;

		svm.SV = zeros(totalSVs, dim);
		for ( i=0; i < totalSVs; i++) {
			for ( var j=0; j < dim; j++) {
				if ( SV[i].hasOwnProperty(j) && SV[i][j] ) // some entries might be left undefined...
					svm.SV.val[i*dim+j] = SV[i][j];
			}
		}

	}
	else {
		svm.labels = labels;
		svm.numericlabels = range(Nclasses);
		// SVs..
	}
	svm.dim_input = dim;
	svm.C = undefined;

	svm.b = minus(rho);
	svm.alpha = alpha;
	svm.SVindexes = SVindexes;
	svm.SVlabels = SVlabels;
	// compute svm.w if linear ??

	svm.kernelFunc = kernelFunction(kerneltype, kernelpar); // use sparse input vectors?

	return svm;
}

function readLibSVMdata ( str ) {

	// Read a libsvm data file and return {X, y}
	var i,j;
	var rows = str.split("\n");
	if ( rows[rows.length-1] == "" )
		rows.splice(rows.length-1,1);
	const N = rows.length;

	var dim_input = -1;

	var X = new Array(N);
	var Y = zeros(N);
	for(i = 0; i< N; i++) {
		// template Array for data values
		X[i] = new Array(Math.max(1,dim_input));

		// Get line as array of substrings
		var row = rows[i].split(" ");

		Y[i] = parseFloat(row[0]);
		for ( j=1; j < row.length; j++) {
			var feature = row[j].split(":");
			var idx = parseInt(feature[0]);
			X[i][idx-1] = parseFloat( feature[1] );

			if ( idx > dim_input)
				dim_input = idx;
		}
	}
	rows = undefined; // free memory

	var Xmat = zeros(N, dim_input);
	for(i = 0; i< N; i++) {
		for ( j in X[i]) {
			if (X[i].hasOwnProperty(j) && X[i][j])
				Xmat.val[i*dim_input + parseInt(j)] = X[i][j];
		}
		X[i] = undefined; // free mem as we go...
	}

	return {X: Xmat, y: Y};
}

function readMSVMpack( str ) {
	// read an MSVMpack model from a string

	const MSVMtype = ["WW", "CS", "LLW", "MSVM2"];
	const Ktypes = [undefined, "linear", "rbf", "polyh", "poly"];

	var rows = str.split("\n");
	var version;
	var inttype;
	var i;
	if(rows[0].length < 3 ){
		version = 1.0;	// no version number = version 1.0
		inttype = parseInt(rows[0]);
		i = 1;
	}
	else {
		version = parseFloat(rows[0]);
		inttype = parseInt(rows[1]);
		i = 2;
	}

	if ( inttype > 3 ) {
		error("Unknown MSVM model type in MSVMpack model file");
		return undefined;
	}
	var model = new Classifier(MSVM, {MSVMtype: MSVMtype[inttype]} );

	model.MSVMpackVersion = version;
//	model.OptimAlgorithm = FrankWolfe;	// default back to Frank-Wolfe method
					// use -o 1 to retrain with Rosen's method

	var Q = parseInt(rows[i]);
	i++;
	model.labels = range(1,Q+1);
	model.numericlabels = range(Q);

	var intKtype = parseInt(rows[i]);
	i++;

	if ( intKtype % 10 <= 4 ) {
		model.kernel = Ktypes[intKtype % 10];
	}
	else {
		error( "Unsupported kernel type in MSVMpack model.");
		return undefined;
	}

	if ( model.kernel != "linear" ) {
		var rowstr = rows[i].split(" ");
		var nKpar = parseInt(rowstr[0]);
		i++;
		if ( nKpar == 1 ) {
			model.kernelpar = parseFloat(rowstr[1]);
		}
		else if (nKpar > 1) {
			error( "MSVMpack with custom kernel cannot be loaded.");
			return undefined;
		}
	}

	model.trainingSetName = rows[i];
	i++;

	model.trainingError = parseFloat(rows[i]);
	i++;

	var nb_data = parseInt(rows[i]);
	i++;

	var dim_input = parseInt(rows[i]);
	i++;
	model.dim_input = dim_input;

	// C hyperparameters
	if (version > 1.0) {
		var Cstr = rows[i].split(" ");
		model.Ck = zeros(Q);
		for(var k=0;k<Q;k++)
			model.Ck[k] = parseFloat(Cstr[k]);
		model.C = model.Ck[0];
		i++;
	}
	else {
		model.C = parseFloat(rows[i]);
		i++;
	}

	var normalization = parseFloat(rows[i]);
	i++;

	if(normalization >= 0.0) {
		var mean = zeros(dim_input);
		var std = zeros(dim_input);
		mean[0] = normalization;
		var meanstr = rows[i].split(" ");
		i++;
		for(var k=1;k<dim_input;k++)
			mean[k] = parseFloat(meanstr[k]);
		var stdstr = rows[i].split(" ");
		i++;
		for(var k=0;k<dim_input;k++)
			std[k] = parseFloat(stdstr[k]);
		model.normalization = {mean:mean, std:std};
	}
	else
		model.normalization = "none";

	// Model file format could change with MSVM type
	// The following loads the model accordingly
	var k;
	var ii;

	// Allocate memory for model parameters
	var alpha = zeros(nb_data,Q);
	model.b = zeros(Q);
	var SVindexes = new Array();
	var SV = new Array();
	var SVlabels = new Array();

	// Read b
	var rowstr = rows[i].split(" ");
	i++;
	for(k=0; k<Q; k++)
		model.b[k] = parseFloat(rowstr[k]);

	var nSV = 0;
	for(ii=0; ii < nb_data; ii++) {

		// Read [alpha_i1 ... alpha_iQ]
		var rowstr = rows[i].split(" ");
		rows[i] = undefined;
		i++;
		var isSV = false;
		for(k=0; k<Q; k++) {
			alpha.val[ii*Q + k] = parseFloat(rowstr[k]);
			isSV = isSV || (alpha.val[ii*Q + k] != 0) ;
		}
		if ( isSV ) {
			// Read x_i
			var rowstr = rows[i].split(" ");
			rows[i] = undefined;
			i++;
			SV.push(new Array(dim_input));
			for(k=0; k<dim_input; k++)
				SV[nSV][k] = parseFloat(rowstr[k]);

			// Read y_i
			SVlabels.push( parseInt(rowstr[dim_input]) - 1 );

			SVindexes.push(ii);
			nSV++;
		}
		else
			i++;
	}
	model.alpha = transpose(alpha);
	model.SVindexes = SVindexes;
	model.SVlabels = SVlabels;
	model.SV = mat(SV, true);

	return model;
}
/*
	Utility functions for ML
*/

/////////////////////////////////////
/// Text functions
/////////////////////////////////////
function text2vector( str, dictionnary , multi) {
	var countmulti = false;
	if ( typeof(multi) != "undefined" && multi )
		countmulti = true;

	var words = str.split(/[ ,;:\?\!\(\)\.\n]+/g);
	var vec = zeros(dictionnary.length);
	for ( var w = 0; w < words.length; w++ )  {
		if ( words[w].length > 2 ) {
			var idx = dictionnary.indexOf( words[w].toLowerCase() );
			if ( idx >= 0 && (countmulti || vec[idx] == 0) )
				vec[ idx ]++;
		}
	}

	return vec;
}
function text2sparsevector( str, dictionnary, multi ) {
	var countmulti = false;
	if ( typeof(multi) != "undefined" && multi ) {
		countmulti = true;
		var val = new Array();
	}

	var words = str.split(/[ ,;:\?\!\(\)\.\n]+/g);
	var indexes = new Array();

	for ( var w = 0; w < words.length; w++ )  {
		if ( words[w].length > 2 ) {
			var idx = dictionnary.indexOf(words[w].toLowerCase() );
			if ( idx >= 0 ) {
				if ( countmulti ) {
					if ( indexes.indexOf(idx) < 0) {
						val.push(1);
						indexes.push( idx );
					}
					else {
						val[indexes.indexOf(idx)] ++;
					}
				}
				else {
					if (indexes.indexOf(idx) < 0)
						indexes.push( idx );
				}
			}
		}
	}
	if ( countmulti ) {
		var idxsorted = sort(indexes, false, true);
		val = get(val,idxsorted);
		var vec = new spVector(dictionnary.length, val, indexes);
	}
	else
		var vec = new spVector(dictionnary.length, ones(indexes.length),sort(indexes));
	return vec;
}

return {
	// lalolibbase.js
	// constants?
	laloprint: laloprint,
	lalo: lalo,
	MLlab: MLlab,
	Lalolab: Lalolab,
	load_data: load_data,

	// Constants in linalg.js
	LALOLIB_ERROR: LALOLIB_ERROR,
	EPS: EPS,


	// linalg.js
	isZero: isZero,
	tic: tic,
	toc: toc,
	type: type,
	isArrayOfNumbers: isArrayOfNumbers,
	isScalar: isScalar,
	printVector: printVector,
	Matrix: Matrix,
	array2mat: array2mat,
	array2vec: array2vec,
	size: size,
	ones: ones,
	zeros: zeros,
	eye: eye,
	diag: diag,
	vec: vec,
	matrixCopy: matrixCopy,
	vectorCopy: vectorCopy,
	vectorCopyInto: vectorCopyInto,
	arrayCopy: arrayCopy,
	appendRow: appendRow,
	reshape: reshape,
	get: get,
	getSubMatrix: getSubMatrix,
	getRows: getRows,
	getCols: getCols,
	getSubVector: getSubVector,
	getSubArray: getSubArray,
	getrowref: getrowref,
	set: set,
	setVectorScalar: setVectorScalar,
	setVectorVector: setVectorVector,
	setMatrixScalar: setMatrixScalar,
	setMatrixMatrix: setMatrixMatrix,
	setMatrixColVector: setMatrixColVector,
	setMatrixRowVector: setMatrixRowVector,
	setRows: setRows,
	setCols: setCols,
	dense: dense,
	supp: supp,
	range: range,
	swaprows: swaprows,
	swapcols: swapcols,
	randnScalar: randnScalar,
	randn: randn,
	randVector: randVector,
	randMatrix: randMatrix,
	rand: rand,
	randnsparse: randnsparse,
	randsparse: randsparse,
	randperm: randperm,
	// missing: MathFunctions + MathFunctionsVector...
	apply: apply,
	aaplyVector: applyVector,
	applyMatrix: applyMatrix,
	applyComplexVector: applyComplexVector,
	applyComplexMatrix: applyComplexMatrix,
	mul: mul,
	mulScalarVector: mulScalarVector,
	mulScalarMatrix: mulScalarMatrix,
	dot: dot,
	mulMatrixVector: mulMatrixVector,
	mulMatrixTransVector: mulMatrixTransVector,
	mulMatrixMatrix: mulMatrixMatrix,
	entrywisemulVector: entrywisemulVector,
	entrywisemulMatrix: entrywisemulMatrix,
	entrywisemul: entrywisemul,
	saxpy: saxpy,
	gaxpy: gaxpy,
	divVectorScalar: divVectorScalar,
	divScalarVector: divScalarVector,
	divVectors: divVectors,
	divMatrixScalar: divMatrixScalar,
	divScalarMatrix: divScalarMatrix,
	divMatrices: divMatrices,
	entrywisediv: entrywisediv,
	outerprodVectors: outerprodVectors,
	outerprod: outerprod,
	addScalarVector: addScalarVector,
	addScalarMatrix: addScalarMatrix,
	addVectors: addVectors,
	addMatrices: addMatrices,
	add: add,
	subScalarVector: subScalarVector,
	subVectorScalar: subVectorScalar,
	subScalarMatrix: subScalarMatrix,
	subMatrixScalar: subMatrixScalar,
	subVectors: subVectors,
	subMatrices: subMatrices,
	sub: sub,
	pow: pow,
	minus: minus,
	minusVector: minusVector,
	minusMatrix: minusMatrix,
	minVector: minVector,
	minMatrix: minMatrix,
	minVectorScalar: minVectorScalar,
	minMatrixScalar: minMatrixScalar,
	minMatrixRows: minMatrixRows,
	minMatrixCols: minMatrixCols,
	minVectorVector: minVectorVector,
	minMatrixMatrix: minMatrixMatrix,
	min: min,
	maxVector: maxVector,
	maxMatrix: maxMatrix,
	maxVectorScalar: maxVectorScalar,
	maxMatrixScalar: maxMatrixScalar,
	maxMatrixRows: maxMatrixRows,
	maxMatrixCols: maxMatrixCols,
	maxVectorVector: maxVectorVector,
	maxMatrixMatrix: maxMatrixMatrix,
	max: max,
	transposeMatrix: transposeMatrix,
	transposeVector: transposeVector,
	transpose: transpose,
	det: det,
	trace: trace,
	triiu: triu,
	tril: tril,
	issymmetric: issymmetric,
	mat: mat,
	isEqual: isEqual,
	isNotEqual: isNotEqual,
	isGreater: isGreater,
	isGreaterOrEqual: isGreaterOrEqual,
	isLower: isLower,
	isLowerOrEqual: isLowerOrEqual,
	find: find,
	argmax: argmax,
	findmax: findmax,
	argmin: argmin,
	findmin: findmin,
	sort: sort,
	sumVector: sumVector,
	sumMatrix: sumMatrix,
	sumMatrixRows: sumMatrixRows,
	sumMatrixCols: sumMatrixCols,
	sum: sum,
	prodVector: prodVector,
	prodMatrix: prodMatrix,
	prodMatrixRows: prodMatrixRows,
	prodMatrixCols: prodMatrixCols,
	prod: prod,
	mean: mean,
	variance: variance,
	std: std,
	cov: cov,
	xtx: xtx,
	norm: norm,
	norm1: norm1,
	norminf: norminf,
	normp: normp,
	normnuc: normnuc,
	norm0: norm0,
	norm0Vector: norm0Vector,
	solve: solve,
  solveWithQRcolumnpivoting: solveWithQRcolumnpivoting,
	cholsolve: cholsolve,
	// solveQR...
	inv: inv,
	chol: chol,
	ldlsymmetricpivoting: ldlsymmetricpivoting,
	qr: qr,
	solvecg: solvecg,
	cgnr: cgnr,
	eig: eig,
	eigs: eigs,
	svd: svd,
	rank: rank,
	nullspace: nullspace,
	orth: orth,

	// stats.js
	nchoosek: nchoosek,
	mvnrnd: mvnrnd,
	Distribution: Distribution,
	Uniform: Uniform,
	Gaussian: Gaussian,
	mvGaussian: mvGaussian,
	Bernoulli: Bernoulli,
	Poisson: Poisson,

	// sparse.js
	spVector: spVector,
	spMatrix: spMatrix,
	spgetRows: spgetRows,
	fullVector: fullVector,
	fullMatrix: fullMatrix,
	full: full,
	sparseVector: sparseVector,
	sparseMatrix: sparseMatrix,
	sparseMatrixRowMajor: sparseMatrixRowMajor,
	sparse: sparse,
	speye: speye,
	spdiag: spdiag,
	transposespVector: transposespVector,
	transposespMatrix: transposespMatrix,
	spmat: spmat,
	mulScalarspVector: mulScalarspVector,
	mulScalarspMatrix: mulScalarspMatrix,
	spdot: spdot,
	dotspVectorVector: dotspVectorVector,
	mulMatrixspVector: mulMatrixspVector,
	mulspMatrixVector: mulspMatrixVector,
	mulspMatrixTransVector: mulspMatrixTransVector,
	mulspMatrixspVector: mulspMatrixspVector,
	mulspMatrixTransspVector: mulspMatrixTransspVector,
	mulspMatrixspMatrix: mulspMatrixspMatrix,
	mulMatrixspMatrix: mulMatrixspMatrix,
	mulspMatrixMatrix: mulspMatrixMatrix,
	entrywisemulspVectors: entrywisemulspVectors,
	entrywisemulspVectorVector: entrywisemulspVectorVector,
	entrywisemulspMatrices: entrywisemulspMatrices,
	entrywisemulspMatrixMatrix: entrywisemulspMatrixMatrix,
	addScalarspVector: addScalarspVector,
	addVectorspVector: addVectorspVector,
	addspVectors: addspVectors,
	addScalarspMatrix: addScalarspMatrix,
	addMatrixspMatrix: addMatrixspMatrix,
	addspMatrices: addspMatrices,
	spsaxpy: spsaxpy,
	subScalarspVector: subScalarspVector,
	subVectorspVector: subVectorspVector,
	subspVectorVector: subspVectorVector,
	subspVectors: subspVectors,
	subScalarspMatrix: subScalarspMatrix,
	subspMatrixMatrix: subspMatrixMatrix,
	subMatrixspMatrix: subMatrixspMatrix,
	subspMatrices: subspMatrices,
	applyspVector: applyspVector,
	applyspMatrix: applyspMatrix,
	sumspVector: sumspVector,
	sumspMatrix: sumspMatrix,
	sumspMatrixRows: sumspMatrixRows,
	sumspMatrixCols: sumspMatrixCols,
	prodspMatrixRows: prodspMatrixRows,
	prodspMatrixCols: prodspMatrixCols,

	// complex.js
	Complex: Complex,
	addComplex: addComplex,
	addComplexReal: addComplexReal,
	subComplex: subComplex,
	minusComplex: minusComplex,
	mulComplex: mulComplex,
	mulComplexReal: mulComplexReal,
	divComplex: divComplex,
	conj: conj,
	modulus: modulus,
	absComplex: absComplex,
	expComplex: expComplex,
	ComplexVector: ComplexVector,
	ComplexMatrix: ComplexMatrix,
	real: real,
	imag: imag,
	transposeComplexMatrix: transposeComplexMatrix,
	addComplexVectors: addComplexVectors,
	subComplexVectors: subComplexVectors,
	addComplexMatrices: addComplexMatrices,
	subComplexMatrices: subComplexMatrices,
	addComplexVectorVector: addComplexVectorVector,
	subComplexVectorVector: subComplexVectorVector,
	addComplexMatrixMatrix: addComplexMatrixMatrix,
	subComplexMatrixMatrix: subComplexMatrixMatrix,
	addScalarComplexVector: addScalarComplexVector,
	subScalarComplexVector: subScalarComplexVector,
	addScalarComplexMatrix: addScalarComplexMatrix,
	entrywisemulComplexVectors: entrywisemulComplexVectors,
	entrywisedivComplexVectors: entrywisedivComplexVectors,
	entrywisemulComplexMatrices: entrywisemulComplexMatrices,
	entrywisedivComplexMatrices: entrywisedivComplexMatrices,
	entrywisemulComplexVectorVector: entrywisemulComplexVectorVector,
	entrywisemulComplexMatrixMatrix: entrywisemulComplexMatrixMatrix,
	minusComplexVector: minusComplexVector,
	minusComplexMatrix: minusComplexMatrix,
	sumComplexVector: sumComplexVector,
	sumComplexMatrix: sumComplexMatrix,
	norm1ComplexVector: norm1ComplexVector,
	norm2ComplexVector: norm2ComplexVector,
	normFroComplexMatrix: normFroComplexMatrix,
	dotComplexVectors: dotComplexVectors,
	dotComplexVectorVector: dotComplexVectorVector,
	mulScalarComplexVector: mulScalarComplexVector,
	mulComplexComplexVector: mulComplexComplexVector,
	mulComplexVector: mulComplexVector,
	mulScalarComplexMatrix: mulScalarComplexMatrix,
	mulComplexComplexMatrix: mulComplexComplexMatrix,
	mulComplexMatrix: mulComplexMatrix,
	mulComplexMatrixVector: mulComplexMatrixVector,
	mulComplexMatrixComplexVector: mulComplexMatrixComplexVector,
	mulComplexMatrices: mulComplexMatrices,
	mulComplexMatrixMatrix: mulComplexMatrixMatrix,
	fft: fft,
	ifft: ifft,
	dft: dft,
	idft: idft,
	spectrum: spectrum,

	// Clustering.js
	spectralclustering: spectralclustering,
	kmeans: kmeans,

	// Regression.js
	Regression: Regression,
	AutoReg: AutoReg,
	LeastSquares: LeastSquares,
	LeastAbsolute: LeastAbsolute,
	KNNreg: KNNreg,
	RidgeRegression: RidgeRegression,
	ridgeregression: ridgeregression,
	KernelRidgeRegression: KernelRidgeRegression,
	SVR: SVR,
	LASSO: LASSO,
	LARS: LARS,
	lars: lars,
	OLS: OLS,
	MLPreg: MLPreg,
	SwitchingRegression: SwitchingRegression,
	kLinReg: kLinReg,
	normalize: normalize,
	ar: ar,

	// Classifier.js
	train: train,
	predict: predict,
	test: test,
	Classifier: Classifier,
	LDA: LDA,
	QDA: QDA,
	Perceptron: Perceptron,
	MLP: MLP,
	SVM: SVM,
	// MSVM: MSVM, require glpk
	KNN: KNN,
	knnsearch: knnsearch,
	NaiveBayes: NaiveBayes,
	DecisionTree: DecisionTree,
	LogReg: LogReg,

	// DimReduction.js
	DimReduction: DimReduction,
	PCA: PCA,
	LLE: LLE,
	ltsa: ltsa,
	distanceMatrix: distanceMatrix,

	// kernel.js
	kernel: kernel,

	// Loaders.js
	loadmodel: loadmodel,
	loaddata: loaddata,
	readLibSVM: readLibSVM,
	readLibSVMdata: readLibSVM,
	readMSVMpack: readMSVMpack,

	// MLutils.js
	text2vector: text2vector,
	text2sparsevector: text2sparsevector,

	// optim.js
	minimize: minimize,
	secant: secant,
	steepestdescent: steepestdescent,
	bfgs: bfgs

}
}));
