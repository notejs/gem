define(["..", "dojo/_base/lang", "dojo/dom-construct", '../canvasDashedLine'],
	function(dojox, lang, domConstruct, dashedLine){
	
	var integerReg =/^-?[1-9]\d*$/;
	
	//半个像素 
	function halfPixel(x){
		return integerReg.test(x)?(x+0.5):x;
	};
	var _formatter = {
			'%Y-%m-%d %H:%M': function(ts){
				var dt = new Date(ts);
				var str = dt.getFullYear() + '-' + (100 + dt.getMonth() + 1).toString().substring(1) + '-' + (100 + dt.getDate()).toString().substring(1)
					+ ' ' + (100 + dt.getHours()).toString().substring(1) + ':' + (100 + dt.getMinutes()).toString().substring(1);
				return str;
			},
			'%H:%M': function(ts){
				var dt = new Date(ts);
				var str =  (100 + dt.getHours()).toString().substring(1) + ':' + (100 + dt.getMinutes()).toString().substring(1);
				return str;
			},
			'%m/%d %H:%M': function(ts){
				var dt = new Date(ts);
				var str =  (100 + dt.getMonth() + 1).toString().substring(1) + '/' + (100 + dt.getDate()).toString().substring(1)
					+ ' ' + (100 + dt.getHours()).toString().substring(1) + ':' + (100 + dt.getMinutes()).toString().substring(1);
				return str;
			},
			'%Y/%m/%d': function(ts){
				var dt = new Date(ts);
				var str =  dt.getFullYear() + '/' + (100 + dt.getMonth() + 1).toString().substring(1) + '/' + (100 + dt.getDate()).toString().substring(1);
				return str;
			}
		};
	var g = lang.getObject("customfig.utils", true, dojox);

	lang.mixin(g, {
		//组织x轴label
		organizeXLabels: function(timeNum, times){
			var curT, curT1, result = [];
			for(var i = 0; i < timeNum * 2; i += 2){
				var TimeBuckets = [];
				curT = times[i] * 1;
				curT1 = times[i+1] * 1;
				if(curT !== 0 && curT1){
					for(var j =( i ? curT+60 : curT); j <= curT1; j+=60){
						TimeBuckets.push(this.from5StrToHM("%h:%m", j));
					}
				}
				result.push(TimeBuckets);
			}
			return result;
		},
		//计算主商品与叠加商品的交易时间的对应关系
		checkSameValueInMainarr: function(mainArr,overlapsArr){
			if(this.array2ORarray1(mainArr) === 2){
				mainArr = this.array2toarray1(mainArr);
			}
			if(this.array2ORarray1(overlapsArr) === 2){
				overlapsArr = this.array2toarray1(overlapsArr);
			}
			var result = [], mainIndexObj = {}, index, firstIndexObj ,lastIdndexObj;
    	    for(var i = 0, l = mainArr.length; i < l; i++){
    	    	mainIndexObj[mainArr[i]] = i;
    			result.push({
       				mainIndex: i,
      				value: mainArr[i]
       			});
    	    }
    	   
    	    for(var p = 0, q = overlapsArr.length; p < q; p++){
    	    	index = mainIndexObj[overlapsArr[p]];
    			if(index != undefined){
    				result[index]['overlapsIndex'] = p;
    				if(!firstIndexObj){
    					/** 主商品与叠加商品第一个重合的点 */
    					firstIndexObj = {
							mainIndex: index,
							overlapsIndex: p,
							value: mainArr[index]
    					} 
    				}
    				if(!lastIdndexObj&&index == mainArr.length-1){
						/** 主商品与叠加商品最后一个重合的点 */
						lastIdndexObj = {
							mainIndex: index,
							overlapsIndex: p,
							value: mainArr[index]
    					} 
					}
				}
		    }
		    if(firstIndexObj){
    	    	result.shift();
        	    result.unshift(firstIndexObj);
    	    }
			if(lastIdndexObj){
    	    	result.pop();
        	    result.push(lastIdndexObj);
    	    }
    	    return result;
		},
		//判断一个数组是二维数组还是一维数组
		array2ORarray1: function(array){
			if(Object.prototype.toString.call(array) === '[object Array]'){
				if(Object.prototype.toString.call(array[0]) === '[object Array]'){
					return 2;
				}else{
					return 1;
				}
			}else{
				return 0;
			}
		},
		//二维数组转换为一维数组
		array2toarray1 : function(array2){
			var array1 = [];
			for(var i = 0; i < array2.length ; i++){
				array1 = array1.concat(array2[i]);
			}
			return array1;
		},
		ygrid: function(ymin, ymax, howmany){
			howmany < 2 ? howmany = 2 : null;
			var t = howmany - 1, result = [], approx;
			if(t == 0) t = 1;
			approx = (ymax - ymin) / t;
			for(var i = 0; i < howmany; i++){
				result[i] = ymin + approx*i;
			}
			return result;
		},
		isEmptyObject: function( obj ) { 

			for (var name in obj) { 
				return false; 
			} 
			return true; 
		},
		createCanvas: function(node){
			var c = domConstruct.create("canvas", null, node);
			return c; 
		},
		clearCanvas: function(ctx, x, y, width, height, color) {
            x = Math.round(x);
            y = Math.round(y);
            ctx.clearRect(x, y, width, height); //在给定的矩形内清除所有的像素为透明黑
            ctx.fillStyle = color; // 改变当前的填充风格
            ctx.fillRect(x, y, width, height); // 当前的填充风格填充给定的区域
        },
		drawline: function(ctx, x1, y1, x2, y2, color, width) {
			color = color || "#111111";
			var width = width || 1.0;
			var w = ctx.lineWidth;
			ctx.lineWidth = width;
			ctx.strokeStyle = color;
			ctx.beginPath();
			x1 = halfPixel(x1);
			x2 = halfPixel(x2);
			y1 = halfPixel(y1);
			y2 = halfPixel(y2);
			//console.log(x1+"---"+x2);
			ctx.moveTo(x1,y1);
			ctx.lineTo(x2,y2);
			ctx.stroke();
			ctx.closePath();
			ctx.lineWidth = w;
		},
		drawText: function(ctx, txt, x, y, style) {
            var padding = style.padding || 2;
            ctx.font = style.font || '10pt Arial bold';
            ctx.textAlign = style.align || 'start';
            ctx.textBaseline = style.textBaseline || 'bottom';
            ctx.fillStyle = style.color || 'red';
            ctx.fillText(txt, x + padding, y);
            return ctx.measureText(txt).width;
        },
        
        drawDashes: function(ctx, x1, y1, x2, y2, color, width) {
        	x1 = halfPixel(x1);
			x2 = halfPixel(x2);
			y1 = halfPixel(y1);
			y2 = halfPixel(y2);
        	dashedLine.drawDashedPolyLine(ctx, [[x1,y1],[x2,y2]],{color: color});
	    },
		drawRect: function(ctx, x, y, width, height, isStroke){
			if(isStroke){
				x = halfPixel(x);
				y = halfPixel(y);
				ctx.strokeRect( x, y, width, height);
			}else{
				ctx.fillRect( x, y, width, height);
			}
		},
		drawArrow: function(context, x, y, w, h, color){
			/**
			 * 画箭头
			 */
			  context.lineWidth=2;
			  context.fillStyle= +color;
			  context.beginPath();
			  context.moveTo(x + w/2, y);
			  context.lineTo(x + w, y - h/2);
			  context.lineTo(x + 3*w/4, y - h/2);
			  context.lineTo(x + 3*w/4, y - h);
			  context.lineTo(x + w/4, y - h);//4
			  context.lineTo(x + w/4, y - h/2);
			  context.lineTo(x , y - h/2);
			  context.lineTo(x+ w/2, y);
			  context.closePath();
			  context.fill();
			  context.save();
			  if(color.up){	//向上箭头，反转
				  context.setTransform(1, 0, 0, 1, 0, 0);
				  context.translate(x + w/2, y - h/2);
				  context.rotate( Math.PI * 180 / 180);
				  context.drawImage(context.canvas, x,y-h,w,h,-w/2,-h/2,w,h);
				  context.restore();
			  }
		},
		/**
		 * 返回二维数组的最大值和最小值
		 */
	    minmax2d: function(data) {
			var max = -Infinity;
			var min = Infinity;
			var sIndex = arguments[1] || 0;
			var eIndex = arguments[2] || data[0].length;
			
			for(var i in data) {
				var childData =  data[i].slice(sIndex,eIndex);
				for (j in childData) {
						if (+childData[j] >= max)  max = childData[j]*1;
						if (+childData[j] < min) min = childData[j]*1; 
				}
			}
			return [+min, +max];
		},

		/**
		 * 返回一维数组的最大值和最小值
		 */
		minmax1d: function(data) { 
			var max = -Infinity;
			var min = Infinity;
			
			for(var i in data) {
			   if (+data[i] >= max)  max = data[i];
			   if (+data[i] < min) min = data[i]; 
			}
			return [+min, +max];
		},//将34200转换成9:30
        from5StrToHM: function(format,time){
        	var h = Math.floor(time/3600);
        	h = (100 + h).toString().substring(1);
        	if(h >= 24){
        		h = (100 + (h - 24)).toString().substring(1);
        	}
        	var hp= time%3600;
    		var m =(100 + Math.floor(hp/60)).toString().substring(1);
    		if("%h:%m" == format){
    			return h + ":" + m;
    		}else if("%h%m" == format){
    			return h + "" + m;
    		}
        },
        
        //将9:30转换成34200
        fromHMTo5Str: function(time){
        	var times = time.split(":");
        	if(times.length>1){
        		return times[0] * 60 * 60 + times[1] * 60;
        	}
        },
        
        date2Millisecond: function(str) { 
			var d;
			
			d = new Date(str).getTime();
			if (!isNaN(d)) {
				return d;
			}
			str = str.replace(/-/g, ' '); //1 Jan 2010 works but 1-Jan-2010 doesn't
			d = new Date(str).getTime();
			if (!isNaN(d)) {
				return d;
			}
			// may be what we've is a time stamp. 
			if((d = parseInt(str)) > 100000) { 
				// we are not handling something that's up on 1st Jan 1971, as yet.
				// assume it is a valid time stamp and just send it back.
			   return d;
			}  
		},
		millisecondChange: function(timestamp,local){
			//字符串
			timestamp += "";
			//时区差
			var hourDiff = new Date().getTimezoneOffset()/60;
			
			//local是本地时间还是格林威治时间
			if(local){
				
				hourDiff = 0;
			}
			
			if(timestamp.length == 5 || timestamp.length == 6){/*分时图取到的交易时间*/
				timestamp = timestamp * 1000 + new Date().setHours(0,0,0,0);
				hourDiff = 0;
			}else if(timestamp.length >= 9){//unix时间戳
				timestamp *= 1000;
			}
			//转换为本地时间
			timestamp = timestamp*1 + hourDiff * 60 *60 * 1000;
			return timestamp;
		},
		millisecond2Date: function(format, timestamp, dateParams, capitalize, local) {
			//字符串
			timestamp = this.millisecondChange(timestamp,local);
			
			if (_formatter[format])
			{
				return _formatter[format](timestamp);
			}
			function defined (obj) {
				return obj !== undefined && obj !== null;
			};

			function pad (number, length) {
				if (length == 2)
				{
					return (100 + number).toString().substring(1);
				} else if (length == 3)
				{
					return (1000 + number).toString().substring(1);
				}
				// two digits
				number = number.toString().replace(/^([0-9])$/, '0$1');
				// three digits
				if (length === 3) {
					number = number.toString().replace(/^([0-9]{2})$/, '0$1');
				}
				return number;
			};

			function pick() {
				var args = arguments,
					i,
					arg,
					length = args.length;
				for (i = 0; i < length; i++) {
					arg = args[i];
					if (typeof arg !== 'undefined' && arg !== null) {
						return arg;
					}
				}
			};

			if (!defined(timestamp) || isNaN(timestamp)) {
				return 'Invalid date';
			}

			format = pick(format, '%Y-%m-%d %H:%M:%S');
			var date = new Date(timestamp),
				key, // used in for constuct below
				// get the basic time values
				hours = date['getHours'](),
				day = date['getDay'](),
				dayOfMonth = date['getDate'](),
				month = date['getMonth'](),
				fullYear = date['getFullYear'](),
				langWeekdays = (dateParams&&dateParams.weekdays)?dateParams.weekdays:['日', '一', '二', '三', '四', '五', '六'],
				langMonths = (dateParams&&dateParams.months)?dateParams.months:['一月', '二月', '三月', '四月', '五月', '六月', '七月',
							'八月', '九月', '十月', '十一月', '十二月'],
				/* // uncomment this and the 'W' format key below to enable week numbers
				weekNumber = function() {
					var clone = new Date(date.valueOf()),
						day = clone[getDay]() == 0 ? 7 : clone[getDay](),
						dayNumber;
					clone.setDate(clone[getDate]() + 4 - day);
					dayNumber = mathFloor((clone.getTime() - new Date(clone[getFullYear](), 0, 1, -6)) / 86400000);
					return 1 + mathFloor(dayNumber / 7);
				},
				*/

				// list all format keys
				replacements = {
					// Day
					'a': langWeekdays[day], // 星期
					'd': pad(dayOfMonth), // 月份的第几天, 01 到 31
					'e': dayOfMonth, // 月份的第几天, 1 到 31

					// Month
					'b': langMonths[month].substr(0, 3), // Short month, like 'Jan'
					'B': langMonths[month], // Long month, like 'January'
					'm': pad(month + 1), // Two digit month number, 01 through 12

					// Year
					'y': fullYear.toString().substr(2, 2), // 两位数字的年份, eg： 2009->09
					'Y': fullYear, // 四位数字的年份, eg：2009

					// Time
					'H': pad(hours), // 24小时制，两位数字的小时, 00 到 23
					'I': pad((hours % 12) || 12), // 12小时制，两位数字的小时, 00 到 11
					'l': (hours % 12) || 12, // 12小时制，小时, 1 到 12
					'M': pad(date['getMinutes']()), // 两位数字的分钟, 00 到 59
					'P': hours < 12 ? 'AM' : 'PM', // 大写AM或PM
					'p': hours < 12 ? 'am' : 'pm', // 小写AM或PM
					'S': pad(date.getSeconds()), // 两位数字的秒, 00 到  59
					'L': pad(timestamp % 1000, 3) // 毫秒数
				};
			// do the replaces
			for (key in replacements) {
				format = format.replace('%'+ key, replacements[key]);
			}

			// Optionally capitalize the string and return
			return capitalize ? format.substr(0, 1).toUpperCase() + format.substr(1) : format;
		},
		str2millisecond:function(dstr){
				/*dstr 数据格式
				* 20120801000000
				*/
				var y,M,d,h,m,s,str,date,millsecond, hourDiff = new Date().getTimezoneOffset()/60;
				y = dstr.substr(0,4);
				M = dstr.substr(4,2);
				d = dstr.substr(6,2);
				h = dstr.substr(8,2);
				m = dstr.substr(10,2);
				s = dstr.substr(12,2);
				
				str = y +'-' + M + '-' + d + 'T' + h +':'+ m + ':'+ s;
				date = new Date(str);
				millsecond = date.getTime()/1000;
				//millsecond = millsecond + hourDiff * 60 * 60; 
				return millsecond;
		}
		
	})
	
	return g;
			
	
})