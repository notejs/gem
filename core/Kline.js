define(["dojo/_base/declare", "dojo/_base/lang", "../Element", "../utils","dojo/_base/array", "dojo/dom-style", 
        "dojo/dom-construct", "dojo/dom-geometry", "dojo/cssScale" ],
	function(declare, lang, Element, util, array, domStyle, domConstruct, domGeometry, cssScale){
	
	var kline = declare("dojox.customfig.mains.Kline", [Element], {
		/**
		 * 数据:baseValue(昨收价) tradeTime(交易时间段) price(价格) time(时间)
		 * */
		
		type: 'kline',
		
		txt: '分钟线',
		startTime : null,
		endTime : null,
		count : 0,
		allKey : [],
		
		isPercentLabelShow: true,	//是否显示 百分比
		
		percentLabelDom: null,//百分比label dom
		
		/** 每个点的图形对应的该点所占宽度的比例
		 *  也用来判断是分时图还是k线图的一个标志
		 *  k线图是图形的中间点
		 *  分时图是图形的左边点
		 *  k线图与分时图画图的起始位置不一样
		 *  */
		csizeRate: 1.6,		// 每一块的宽度/1.6为柱的宽度	有此属性的为kline没有为分时									
		
		defaultOptions: {
			overlapType: 0,									/** 叠加类型 默认属于同比例叠加 非同比例叠加没有听说过*/
			klineType: 1, 									/** 主图线形  1: k线, 2竹线, 3: 收盘线 */
			fixedNum: 2,									/** 小数位数*/
			xLabelsInterval: 5,
			showCounts:10,									/**x轴显示个数*/
			topSpacing: 10,									/**y 轴预留的空间*/
			bottomSpacing: 10,								/**y 轴预留的空间*/
			isHighLowShowed:true									/**是否显示最高最低*/
			,isDrawName:true
		},
		
		constructor: function(plot, kwArgs){
			this._options = lang.mixin({}, this.defaultOptions, kwArgs.options);
			this.mainLabels = kwArgs.mainLabels ? kwArgs.mainLabels : [], //格式 []
			kwArgs.txt ? this.txt = kwArgs.txt : null;
			kwArgs.startTime ? this.startTime = kwArgs.startTime : null;
			kwArgs.endTime ? this.endTime = kwArgs.endTime : null;
			kwArgs.count ? this.count = kwArgs.count : null;
			this.yLabels = kwArgs.yLabels ? kwArgs.yLabels : [];//格式   []
			this.xLabels = kwArgs.xLabels ? kwArgs.xLabels : [];//格式   []
			this.data = kwArgs.data ? kwArgs.data : [];//格式  	[[], [], ...] 
			//每个叠加商品交易时间与主商品的交易时间对应关系
			//格式 [[{mainIndex:0,overlapsIndex:30,value:'9:30'}, {}, ...],[], ....]
			this.timeKey = kwArgs.timeKey ? kwArgs.timeKey : []; 
			
			this.plot.csizeRate = this.csizeRate;
		},
		//设置绘图区域相关参数
		setGeometry: function(kwArgs){
			this.ctx = kwArgs.ctx;
			this.offsets = kwArgs.offsets;
			this.height = kwArgs.height;
			this.width = kwArgs.width;
			this.yStart = kwArgs.yStart;
			this.xStart = kwArgs.xStart;
			this.margins = kwArgs.margins;
			this.options =lang.mixin({}, kwArgs.theme.com_de_opt, kwArgs.theme[this.type], this._options);
		},
		//计算数据的最大值和最小值   组织x轴坐标刻度
		coreRange: function(){
			var options = this.options, xLabels = this.xLabels , data = this.data, timeKey = this.timeKey,_this = this,
				ymax = -Infinity, ymin = Infinity, dymax, dymin, xLabelsNum, minmax = [], percent, key;
			xLabels && xLabels.length ? xLabelsNum = this._getLabelsLength() : xLabelsNum = this.width;
			//计算每个数据点的宽度， k线与分时图的算法不一样 绘制指标时根据this.plot.csizeRate来区别
			this.cwidth = (this.width - options.prepareDistance)/ xLabelsNum;
			this.csize = this.cwidth / this.plot.csizeRate;//每根柱的宽度
			if(data && data.length){
				array.forEach(data, function(item, itemIndex){
					//此处不应该取item中里面数据的最大值和最小值,应该取要叠加的数据里面的最大和最小
					if(timeKey && timeKey[itemIndex - 1] && item[3]){						
						key = timeKey[itemIndex - 1];
						minmax = util.minmax2d(item,key[0].overlapsIndex,key[key.length-1].overlapsIndex);
						if(key[0] && key[0].overlapsIndex != undefined){
							//叠加商品的与主商品第一交易时间点相同的收盘价比值
							percent = item[3][key[0].overlapsIndex] / data[0][3][_this.start+key[0].mainIndex];
							//将比值赋值给key的第一个元素
							key[0].percent = percent;//永远到第一个里面去取比例关系
							ymin = Math.min(ymin, minmax[0] / percent);
							ymax = Math.max(ymax, minmax[1] / percent);
						}
					}else{//非叠加的最大最小
						minmax = util.minmax2d(item,_this.start,_this.end);
						ymin = Math.min(ymin, minmax[0]);
						ymax = Math.max(ymax, minmax[1]);
						_this.mainMax = +ymax;
						_this.mainMin = +ymin;
					}
				});
			}else{
				ymax = this.height;
				ymin = 0;
			}
			if(this.maMaxAndMin){
				ymin = Math.min(ymin, this.maMaxAndMin[0]);
				ymax = Math.max(ymax, this.maMaxAndMin[1]);
			 
			}
			this.ymin = +ymin;
			this.ymax = +ymax;
			this.yAxisRange = this.ymax - this.ymin;
			if(this.yAxisRange == 0) {
				this.yAxisRange = this.ymax * 2;
			}
	        this.yAxisScale = (this.height - options.topSpacing - options.bottomSpacing) / this.yAxisRange;
		},
		//绘制主商品
		drawMain: function(){
			this.drawPlot();
		},
		/** 蜡烛图 */
		drawCandle: function(open, high, low, close, i, j){
			var ctx = this.ctx, options = this.options, ymin = this.ymin, yEnd = this.yStart + this.height- options.bottomSpacing,
				prepareDistance = options.prepareDistance, yAxisScale = this.yAxisScale, cwidth = this.cwidth, csize = this.csize,
				xStart = this.xStart, candleStyle = options.candleStyle, xline, yopen, yhigh, ylow, yclose, rectHeight, color;
				
			yopen = yEnd - (open - ymin) * yAxisScale;
			yhigh = yEnd - (high - ymin) * yAxisScale;
			ylow = yEnd - (low - ymin) * yAxisScale;
			yclose = yEnd - (close - ymin) * yAxisScale;
			
			
				
				
				if(close > open){//up
					rectHeight = yopen - yclose;
					if(yclose === yopen){
						rectHeight = 1;
					}
					color = candleStyle[i].upStyle.candle.color;
					ctx.strokeStyle = color;
					if(csize > 1){
						xline = prepareDistance + (j * cwidth) + xStart;
						util.drawRect(ctx, xline, yclose, csize, rectHeight, true);
						util.drawline(ctx, xline + csize / 2, yhigh, xline + csize / 2, yclose, color, 1); //上影线
						util.drawline(ctx, xline + csize / 2, yopen, xline + csize / 2, ylow, color, 1);  //下影线
					}else{
						xline = prepareDistance + (j * cwidth) + xStart + csize / 2;
						util.drawline(ctx, xline, yhigh, xline, ylow, color, 1);  //下影线
					}
				}else{//down
					rectHeight = yclose - yopen;
					if(yclose === yopen){
						rectHeight = 1;
					}
					color = candleStyle[i].downStyle.candle.color;
					ctx.fillStyle = color;
					if(csize > 1){
						xline = prepareDistance + (j * cwidth) + xStart;
						util.drawRect(ctx, xline, yopen, csize, rectHeight, false);
						util.drawline(ctx, xline + csize / 2, yhigh, xline + csize / 2, yclose, color, 1); //上影线
						util.drawline(ctx, xline + csize / 2, yopen, xline + csize / 2, ylow, color, 1); //下影线
					}else{
						xline = prepareDistance + (j * cwidth) + xStart + csize / 2;
						util.drawline(ctx, xline, yhigh, xline, ylow, color, 1);  //下影线
					}
				}
		},
		/** 竹线图 
		*i 商品索引
		*j 数据索引
		*/
		drawBamboo: function(open, high, low, close, i, j){
			var ctx = this.ctx, options = this.options, ymin = this.ymin, yEnd = this.yStart + this.height- options.bottomSpacing,
				prepareDistance = options.prepareDistance, yAxisScale = this.yAxisScale, cwidth = this.cwidth, csize = this.csize,
				xStart = this.xStart, candleStyle = options.candleStyle, xline, yopen, yhigh, ylow, yclose, color;
				
			yopen = yEnd - (open - ymin) * yAxisScale;
			yhigh = yEnd - (high - ymin) * yAxisScale;
			ylow = yEnd - (low - ymin) * yAxisScale;
			yclose = yEnd - (close - ymin) * yAxisScale;
			
			xline = prepareDistance + (j * cwidth) + xStart;
			if(close > open){//up
				color = candleStyle[i].upStyle.candle.color;
				util.drawline(ctx, xline+ csize / 2, yhigh, xline + csize / 2, ylow, color, 1); //主线
				util.drawline(ctx, xline + csize / 2, yclose, xline + csize, yclose, color, 1); //收盘价
				util.drawline(ctx, xline, yopen, xline + csize/2, yopen, color, 1); //开盘价
			}
			else{//down
				color = candleStyle[i].downStyle.candle.color;
				util.drawline(ctx, xline+ csize / 2, yhigh, xline + csize / 2, ylow, color, 1); //主线
				util.drawline(ctx, xline, yopen, xline + csize / 2, yopen, color, 1); //开盘价
				util.drawline(ctx, xline + csize / 2, yclose, xline + csize, yclose, color, 1); //收盘价
			}
		},
		/** 收盘线图 
		*i 商品索引
		*j 数据索引
		*/
		drawLine: function(open, high, low, close, i, j){
			var ctx = this.ctx, options = this.options, ymin = this.ymin, yEnd = this.yStart + this.height- options.bottomSpacing,
				prepareDistance = options.prepareDistance, yAxisScale = this.yAxisScale, cwidth = this.cwidth, csize = this.csize,
				xStart = this.xStart, candleStyle = options.candleStyle, xline, yclose, color,lastclose;
				
			yclose = yEnd - (close - ymin) * yAxisScale;
			
			if(j ==0){//first data
				arguments.callee['lastclose'] =yclose;
				return;//skip the first data
			} 
			
			xline = prepareDistance + (j * cwidth) + xStart;
			lastclose = arguments.callee['lastclose'];
			
			if(close > open)//up
				color = candleStyle[i].upStyle.candle.color;
			else//down
				color = candleStyle[i].downStyle.candle.color;
			
			util.drawline(ctx, xline +csize/2 - cwidth, lastclose, xline + csize/2, yclose, color, 1); //收盘价
			arguments.callee['lastclose'] = yclose;
		},
		/**绘制最高最低Label
		*param:
		*high:数据量
		*j:索引
		*color:颜色
		*/
		drawHighLow:function(high,j,color){
			var ctx = this.ctx, options = this.options, ymin = this.ymin, yEnd = this.yStart + this.height- options.bottomSpacing,
				prepareDistance = options.prepareDistance, yAxisScale = this.yAxisScale, cwidth = this.cwidth, csize = this.csize,
				xStart = this.xStart, candleStyle = options.candleStyle, xline, yhigh, color,fixNum = options.fixedNum,arrowUnit = '8',lwidth = arrowUnit*3,
				yscale = arrowUnit/2,xscale = arrowUnit/2,txt = high.toFixed(fixNum);
				
			yhigh = yEnd - (high - ymin) * yAxisScale;
			
			xline = prepareDistance + (j * cwidth) + xStart +csize/2;
			
			color = color?options.maximumArrow.color:options.minimumArrow.color;
			if( (xline -xStart) > (lwidth + ctx.measureText(txt).width) ){//未超出绘图区域
				util.drawline(ctx, xline, yhigh, xline - lwidth, yhigh, color, 1); //画线
				util.drawline(ctx, xline - xscale, yhigh + yscale, xline, yhigh, color, 1); //上箭头
				util.drawline(ctx, xline - xscale, yhigh - yscale, xline, yhigh, color, 1); //下箭头
				util.drawText(ctx, txt, xline - lwidth, yhigh, {align:'right',textBaseline:'middle', padding:-5, color:color  ,background : options.yAxisLabel.background,  font: options.font});
			}else {//超出绘图区域
				util.drawline(ctx, xline, yhigh, xline + lwidth, yhigh, color, 1); //画线
				util.drawline(ctx, xline + xscale, yhigh + yscale, xline, yhigh, color, 1); //上箭头
				util.drawline(ctx, xline + xscale, yhigh - yscale, xline, yhigh, color, 1); //下箭头
				util.drawText(ctx, txt, xline + lwidth + ctx.measureText(txt).width, yhigh, {align:'right',textBaseline:'middle', padding:-5, color: color,background : options.yAxisLabel.background,  font: options.font});
			}
		},
		drawPlot: function(){
			var options = this.options, klineType = options.klineType, data = this.data, timeKey = this.timeKey,		
			isSkip = false, dataItem, open, high, low, close, drawMaxMin, evaluateSkip, drawPlot;
			if(!data) return;

			for(var i = 0, l = data.length; i < l; i++){
				if(i === 0){ //主商品
					dataItem = data[i];
					for(var j = 0, len = this.end; j+this.start < len; j++){//j 数据项索引
						open = +dataItem[0][j+this.start];
						high = +dataItem[1][j+this.start];
						low = +dataItem[2][j+this.start];
						close = +dataItem[3][j+this.start];
						
						drawMaxMin = function() {
							/*画最大、最小值
							 * */
							if(options.isHighLowShowed){//显示最高最低
								if(high == this.mainMax) {
									if(!this.drawHighLow.maxExecuted){
										this.drawHighLow(high,j,true);
										this.drawHighLow.maxExecuted = true;
									}
								};
								
								if(low == this.mainMin){
									if(!this.drawHighLow.minExecuted){
										this.drawHighLow(low,j);
										this.drawHighLow.minExecuted = true;
									}
								}
							}
						};
						
						evaluateSkip = function () {
							/*评估是否优化性能
							 * */
							var _isSkip = false;
							if(this.end - this.start > 1000){
								var x = ((this.end - this.start)/1000).toPrecision(1);
								var regex = /^-?\d+$/;
								if (j&&!regex.test(j/x)) {//最少要画1000根
									_isSkip = true;
								}
							}
							return _isSkip;
						};
						
						drawPlot = function() {
							/*绘图函数
							 * */
							
							if(klineType === 1){//k线图
								this.drawCandle(open, high, low, close, i, j);
							}else if(klineType === 2){//竹线图
								this.drawBamboo(open, high, low, close, i, j);
							}else if(klineType === 3){//收盘线图
								this.drawLine(open, high, low, close, i, j);
							}
						};
						
						isSkip = evaluateSkip.call(this);
						
						isSkip || drawPlot.call(this);
						drawMaxMin.call(this);
					}
					this.drawHighLow.maxExecuted = false;
					this.drawHighLow.minExecuted = false;
					
				}else if(timeKey[i - 1]){//叠加商品
					var key = timeKey[i - 1], dataTemp=[], percent = key[0].percent, index;
					dataItem = data[i];
					for(var j = 0; j < key.length; j++){
						if(key && key[j].overlapsIndex != undefined){//叠加商品与主商品有对应的数据							
							if(j == 0 && key[j].mainIndex != 0){ 
								continue;
							} //叠加商品在第一个时间点没有数据且第一个点的数据并不是要叠加的第一个数据,
							index = key[j].overlapsIndex;
							open = dataItem[0][index] / percent;
							high = dataItem[1][index] / percent;
							low = dataItem[2][index] / percent;
							close = dataItem[3][index] / percent;
							if(klineType === 1){//k线图
								this.drawCandle(open, high, low, close, i, j);
							}else if(klineType === 2){//竹线图
								this.drawBamboo(open, high, low, close, i, j);
							}else if(klineType === 3){//收盘线图
								this.drawLine(open, high, low, close, i, j);
							}
							dataTemp = [open, high, low, close];
						}else if(dataTemp){
							open = dataTemp[3];
							high = dataTemp[3];
							low = dataTemp[3];
							close = dataTemp[3];
							if(klineType === 1){//k线图
								this.drawCandle(open, high, low, close, i, j);
							}else if(klineType === 2){//竹线图
								this.drawBamboo(open, high, low, close, i, j);
							}else if(klineType === 3){//收盘线图
								this.drawLine(open, high, low, close, i, j);
							}
							dataTemp = [open, high, low, close];
						}
					}
				}
			}
		},
		/**draw y axis*/
		yAxis: function(){
			var ctx = this.ctx,  xStart = this.xStart, xEnd = xStart+ this.width, yStart = this.yStart,height = this.height, yEnd = yStart + height,
				options = this.options, yAxisScale = this.yAxisScale, ymin = this.ymin, ymax = this.ymax, yLabels = this.yLabels, ygrid, leftLabel, y, 
				fixNum = options.fixedNum, data = this.data, mdata , baseValue, rate, color, innerHtml,  top, labelPos; 
			if(yLabels && yLabels.length){

				return;
			}
			
			ygrid = util.ygrid(ymin, ymax,Math.ceil((this.height - options.topSpacing - options.bottomSpacing) / options.backgroundGrid.height));
			
			//横向背景线及坐标
			for(var i = 0, l = ygrid.length; i < l; i++){
				leftLabel = ygrid[i];
				y = yEnd - (ygrid[i] - ymin) * yAxisScale - options.bottomSpacing;
				
				if(ymin == ymax) y = yEnd - ymax * yAxisScale - options.bottomSpacing;
				
//				if(data){ 
					util.drawText(ctx, leftLabel.toFixed(fixNum), xStart, y, {align:'right',textBaseline:'middle', padding:-5, color: options.yAxisLabel.color,background : options.yAxisLabel.background,  font: options.font});
//				}
				this.addPercent(leftLabel, y);//添加百分比显示
					
				if(options.backgroundGrid.type == 'dashed'){
					util.drawDashes(ctx, xStart, y , xEnd, y , options.backgroundGrid.color, 1);  // 画表格背景线  横线
				}else{
					util.drawline(ctx, xStart, y , xEnd, y , options.backgroundGrid.color);  // 画表格背景线 昨收价 横线
				}
			}
		},
		addPercent:function(leftLabel, y){
			/*
			 * 添加百分比显示
			 * leftLabel：坐标值
			 * y: y值坐标
			 */
			var ctx = this.ctx,  xStart = this.xStart, yStart = this.yStart, xEnd = xStart+ this.width, height = this.height, yEnd = yStart + height,
			options = this.options, yAxisScale = this.yAxisScale, ymin = this.ymin, ymax = this.ymax, fixNum = options.fixedNum, 
			data = this.data, mdata , baseValue, rate, color, innerHtml,  top, labelPos, labelLeft, endValue; 
			
			if(data.length > 1 && this.isPercentLabelShow) { //存在叠加
				
				//取到收盘价基值
				mdata = data[0];
				baseValue = +mdata[3][this.start];
				endValue = +mdata[3][this.end -1];
				
				//取到百分比、颜色
				rate =( leftLabel - baseValue ) / baseValue ;
				if(rate >0 ){
					color = options.yAxisUpLabel.color;
				}else {
					color = options.yAxisLowLabel.color;
				}
				rate = Math.abs( rate );
				
				//设置lable dom
				innerHtml =	"<strong></strong><div style ='width: 5px; height: 5px; border-top: #587eb5 2px solid; border-left: #587eb5 2px solid; position: absolute; background: #fff; top: 5px; left:-4px; -webkit-transform: rotate(-45deg) skew(2deg, 0deg);border-radius: 2px;'></div>";
				this.percentLabelDom = this.percentLabelDom || domConstruct.create("div", { innerHTML:innerHtml });
				!this.percentLabelDom.isplaced && domConstruct.place(this.percentLabelDom, this.plot.domNode, "first");
				this.percentLabelDom.isplaced = true;
				this.percentLabelDom.children[0].innerHTML = endValue.toFixed(fixNum);

				//设置label position
				domStyle.set(this.percentLabelDom, this.plot.theme.crosshair.vLabel);//y轴显示
				labelPos = domGeometry.position(this.percentLabelDom);
				
				//设置缩放
				domStyle.set(this.percentLabelDom, {
					"-webkit-transform-origin" : "left top",
					"-webkit-transform" : "scale(" + 1 / cssScale.getScaleX() + "," + 1 / cssScale.getScaleY() + ")"
				});
				
				top =  yStart + (ymax - endValue ) * yAxisScale;
				labelLeft = xEnd + 5;
				domStyle.set(this.percentLabelDom, {position:'absolute', display:'', left: cssScale.scale(labelLeft, 'x') + 'px', top: cssScale.scale(top, "y") + 'px', border:'1px solid rgb(60, 114, 174)', 'z-index':100, width:'72px', opacity:1, background:'#fff'});//y轴显示
					
				util.drawText(ctx, rate.toFixed(fixNum)+'%', xEnd, y, {align:'left',textBaseline:'middle', padding:5, color: color,background : options.yAxisLabel.background, font: options.font});
			}else{
				this.percentLabelDom && domStyle.set(this.percentLabelDom, {display:'none'});//隐藏dom
			}
		},
	/**draw x axis*/
		xAxis: function(){
			/**
			 * 采用下面这种算法是为了与指标的画法兼容，这样表格线才能对齐
			 * */
			
			var ctx = this.ctx, xStart = this.xStart, xEnd = xStart + this.width, yStart = this.yStart, yEnd = yStart + this.height,
				xLabels = this.xLabels, options = this.options, prepareDistance = options.prepareDistance,showCounts = options.showCounts,
				cwidth = this.cwidth, csize = this.csize, xpos,gap, accumulativeWidth = 0 ,preXPos = 0,isArray = Array.isArray(xLabels),
				isArray,length,xBegin,labelWidth,interval;
			/**
			 * 绘制x轴labels及相关东西的逻辑
			 * 1.当绘制第一个点的时候,也就是开盘时间的时候,值为 xStart+prepareDistance+j * cwidth
			 * 2.后面的点的位置为前一个点的位置加上固定的间隔options.xLabelsInterval * cwidth
			 * 3.每一个交易时间段的收盘时间都要尽量体现,也就是当(j-options.xLabelsInterval)!=(length-1)时要去画
			 * 4.由于去除掉了重合的部分,所以从第二个时间段开始,花的第一个点为第options.xLabelsInterval-1个点的位置
			 * 5.除去第一个交易时间段的时间数据为包含全部首尾的,其他时间段的数据均为去掉开始交易时间的一个时间数组
			 * 注 : xLabels[[第一个交易时间段的时间数据],[第二个交易时间段的交易数据],[..],....]
			 */
			 
			if(isArray){//xlabels is array
				for(var i = 0, l = xLabels.length; i < l; i++){
					length = xLabels[i].length;//xLabels count
					
					interval = Math.ceil(length/showCounts);
					options.xLabelsInterval = interval;
					
					xBegin = (i ? interval - 1 : 0);
					for(var j = xBegin ; j < length; j += interval){
						 (j==0 && i==0)/*第一维数组*/
						 			 ?(xpos = xStart + prepareDistance+j * cwidth + csize / 2 )
									 :(xpos = accumulativeWidth +interval * cwidth);
						 //判断是否绘制x轴labels
						 gap = xpos - preXPos; 
						 labelWidth = ctx.measureText(xLabels[i][j]).width;
						if(gap > labelWidth){
							util.drawText(ctx, xLabels[i][j], xpos, yEnd, {align: 'center', textBaseline: 'top', color: options.xAxisLabel.color,background : options.xAxisLabel.background, font: options.font});
							preXPos = xpos;
						}
						accumulativeWidth = xpos;
						if(xpos <= xStart || xpos >= xEnd){ //左边界和右边界背景线不画
							continue;
						}
//						if(options.backgroundGrid.type == 'dashed'){
//							util.drawDashes(ctx, xpos, yEnd , xpos, yStart, options.backgroundGrid.color, 1);  // 画表格背景线  竖线
//						}else if(options.backgroundGrid.type == 'solid'){
//							util.drawline(ctx, xpos, yEnd , xpos, yStart, options.backgroundGrid.color);  // 画表格背景线  竖线
//						}
					}
//					if((j - interval)!=(length-1)){
//						xpos = accumulativeWidth + Math.round(Math.abs(length - 1 - (j - options.xLabelsInterval)) * cwidth);
//						//判断是否绘制x轴labels
//						if((xpos - preXPos) > ctx.measureText(xLabels[i][length-1]).width){
//							util.drawText(ctx, xLabels[i][length-1], xpos, yEnd, {align: 'center', textBaseline: 'top', color: options.xAxisLabel.color,background : options.xAxisLabel.background});
//							preXPos = xpos;
//						}
//						accumulativeWidth = xpos;
//						if(xpos <= xStart || xpos >= xEnd){ //左边界和右边界背景线不画
//							continue;
//						}
////						if(options.backgroundGrid.type == 'dashed'){
////							util.drawDashes(ctx, xpos, yEnd , xpos, yStart, options.backgroundGrid.color, 1);  // 画表格背景线  竖线
////						}else if(options.backgroundGrid.type == 'solid'){
////							util.drawline(ctx, xpos, yEnd , xpos, yStart, options.backgroundGrid.color);  // 画表格背景线  竖线
////						}	
//					}
				}
			}else{
	//			xLabels = this.width;
	//			for(var i = 0, l = xLabels; i < l; i += options.xLabelsInterval){
	//				xpos = xStart + Math.round(prepareDistance + i * cwidth);
	//				//判断是否绘制x轴labels
	//				if((xpos - preXPos) > ctx.measureText(i).width){
	//					util.drawText(ctx, i, xpos, yEnd, {align: 'center', textBaseline: 'top', color: options.xAxisLabel.color});
	//					preXPos = xpos;
	//				}
	//				
	//				if(xpos == xStart || xpos == xEnd){ //左边界和右边界背景线不画
	//					continue;
	//				}
	//				if(options.backgroundGrid.type == 'dashed'){
	//					util.drawDashes(ctx, xpos, yEnd , xpos, yStart, options.backgroundGrid.color, 1);  // 画表格背景线  竖线
	//				}else if(options.backgroundGrid.type == 'solid'){
	//					util.drawline(ctx, xpos, yEnd , xpos, yStart, options.backgroundGrid.color);  // 画表格背景线  竖线
	//				}
	//			}
			}
			
		},
		render: function(){
			var options = this.options, offsets = this.offsets, xStart = this.xStart, yStart = this.yStart,ctx = this.ctx, plot = this.plot,
				margins = this.margins, mainLabelsArr = [], temp = '',color,candleStyle = options.candleStyle;
			//清除绘图区域
			util.clearCanvas(ctx, xStart - offsets.l -this.margins.l, yStart - offsets.t + 1, this.width + offsets.l + offsets.r + margins.l + margins.r + 1, this.height + offsets.t + offsets.b - 1, options.background);
			//绘制边框
			ctx.strokeStyle = options.stroke;
			util.drawRect(ctx, xStart, yStart, this.width, this.height, true);
			//绘制labels
			if(this.mainLabels&&options.isDrawName){
				for(var i = 0, l = this.mainLabels.length; i < l; i++){
					color = candleStyle[i].downStyle.candle.color;
					util.drawText(ctx, this.mainLabels[i], xStart + ctx.measureText(temp).width, yStart -1, {align: 'start', textBaseline: 'bottom', color: color,background : options.background, font: options.font});
					temp += this.mainLabels[i] + ' ';
				}
			}
			//绘制txt
			util.drawText(ctx, this.txt, xStart + ctx.measureText(temp).width, yStart -1, {align: 'start', textBaseline: 'bottom', color: options.label,background : options.background,  font: options.font});
			temp += this.txt + ' ';
			//将所有的labes存储在plot上，用来绘制主图指标时使用
			plot.mainLabels = temp;
			//计算数据的最大、最小涨跌幅及比例
			this.coreRange();
			//绘制x轴及labels
			this.xAxis();
			//绘制y轴及labels
			this.yAxis();
			//绘制图形
			this.drawMain();
		},
		destroy: function(){
			
		},
		setMainLabels: function(label){
			//label = []
			this.mainLabels = label;
			
		},
		getMainLabels: function(){
			return this.mainLabels;
		},
		setMainCode : function(code){
			this.mainCode = code;
		},
		getMainCode : function(){
			return this.mainCode;
		},
		setTimeKey: function(key, i){
			//key = []
			this.allKey[i]=key;
			var keyArr = this.getTimeKey();
			keyArr[i] = util.checkSameValueInMainarr(this.getXLabels()[0], key);
		},
		getTimeKey: function(){
			return this.timeKey;
		},
		setTimeStamp:function(stamp){
			this.timeStamp = stamp;
		},
		getTimeStamp:function(){
			return this.timeStamp;
		},
		setData: function(data, index){
			// data = [[openArr],[highArr],[lowArr],[closeArr]]
			var dataArr = this.getData();
			dataArr[index] = data;
		},
		getData: function(){
			return this.data;
		},
		setXLabels: function(labels){
			//labels = []
			this.allXLabels = labels;
			this.xLabels = [this._getDrawLabels(labels[0])];
		},
		getXLabels: function(){
			return this.xLabels;
		},
		setYLabels: function(labels){
			//labels = []
			this.yLabels = labels;
		},
		getYLabels: function(){
			return this.yLabels;
		},
		setOptions: function(options){
			//options = {}
			this.options = lang.mixin(this.options, options);
		},
		getOptions: function(){
			return this.options;
		},
		setTxt: function(txt){
			//txt = "";
			this.txt = txt;
		},
		clear: function(){
			this.data = [];
			this.timeKey = [];
			this.start = null;
			this.end = null;
			this.olddatalength = null;
			this.allKey = [];
		},
		setStart : function(start){
			this.start = start;
		},
		getStart : function(start){
			return this.start;
		},
		setEnd : function(end){
			this.end = end;
		},
		getEnd : function(end){
			return this.end;
		},
		setCount : function(count){
			this.count = count;
		},
		getCount : function(count){
			return this.count;
		},
		setTimeStyle : function(timeStyle){
			this.timeStyle = timeStyle;
		},
		_getLabelsLength : function(){
			var length = 0;
			for(var i = 0;i<this.xLabels.length ; i++){
				length+=this.xLabels[i].length;
			}
			return length;
		},
		setStartTime: function(time){
			this.startTime = time;
		},
		setEndTime: function(time){
			this.endTime = time;
		},
		_getDrawLabels : function(labels){
			var l= labels.length, stamp = this.getTimeStamp();		
			
			if(this.startTime&&!this.start){ //只有startTime的时候，设置start属性
				//var startTime = util.millisecond2Date(this.timeStyle,util.str2millisecond(this.startTime));
				var startTime =util.str2millisecond(this.startTime);
				for (var i =0 ; i<l;i++){
					if(Number(stamp[i]) >= Number(startTime)){
						this.start = i;
						break;
					}
				}
			}
			if(this.endTime&&!this.end){ //只有endTime的时候，设置end属性
//				var endTime = util.millisecond2Date(this.timeStyle,util.str2millisecond(this.endTime));
				var endTime = util.str2millisecond(this.endTime);
				for (var j =l-1 ; j>=0;j--){
					if(stamp[j] <= endTime){						
						this.end = j+1;
						break;
					}
				}
			}
			if(this.olddatalength && (this.end == this.olddatalength || this.end > this.olddatalength)||this.end==null) {//设置end
				this.end = l;
			}
			var s = (this.end-this.count)>0 ? this.end-this.count : 0;//count 和end对比计算 start
			this.start = this.start&&!this.count ? this.start : (this.count ? s :0);//设置start
					this.start < 0 ? this.start = 0 : null;//排出start尽头问题
			this.olddatalength = l;
			return labels.slice(this.start,this.end);
		}
	});
	
	return kline;
});
