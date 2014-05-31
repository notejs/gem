define(["dojo/_base/declare", "dojo/_base/lang", "../Element", "../utils"],
	function(declare, lang, Element, util){
	
	var sharingPlan = declare("dojox.customfig.mains.SharingPlans", [Element], {
		/**
		 * 数据:baseValue(昨收价) tradeTime(交易时间段) price(价格) time(时间)
		 * */
		
		type: 'sharingPlans',
		
		txt: '分时走势',
		
		defaultOptions: {
			timetrendType: 1,									/** 分时图的类型 */
			overlapType: 0,										/** 叠加类型 默认属于同比例叠加 非同比例叠加没有听说过*/
			timetrendFilled: false,								/** 分时图是否填充 */
			fixedNum: 2,										/** 小数位数,这里指图形上所有数字的小数位数*/
			rateNum: 0.01,										/** 相对于基准值上下涨跌幅 */
			rateNumOffset: 0.1,									/** 数据计算出来的涨跌幅的偏移比例*/
			newTxt: false,										/** 365 头部*/
			isDrawHead: true								/** 是否绘制默认头部*/
		},
		
		constructor: function(plot, kwArgs){
			this._options = lang.mixin({}, this.defaultOptions, kwArgs.options);
			this.mainLabels = kwArgs.mainLabels ? kwArgs.mainLabels : [], //格式 []
			this.baseValue = kwArgs.baseValue ? kwArgs.baseValue : []; //格式  []
			this.yLabels = kwArgs.yLabels ? kwArgs.yLabels : [];//格式   []
			this.xLabels = kwArgs.xLabels ? kwArgs.xLabels : [];//格式   []
			this.data = kwArgs.data ? kwArgs.data : [];//格式  	[[], [], ...] 
			//每个叠加商品交易时间与主商品的交易时间对应关系
			//格式 [[{mainIndex:0,overlapsIndex:30,value:'9:30'}, {}, ...],[], ....]
			this.timeKey = kwArgs.timeKey ? kwArgs.timeKey : []; 
			this.drawbase = false;
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
			var maxRate = 0, dymaxRate, dyminRate, baseValue, xLabelsNum, data = this.data, options = this.options;
			this.baseValue && this.baseValue.length ? baseValue = this.baseValue  : baseValue = this.baseValue[0] = this.yStart + this.height/2;
			this.xLabels && this.xLabels.length ? xLabelsNum = this._getLabelsLength() : xLabelsNum = this.width;
			//计算每个数据点的宽度， k线与分时图的算法不一样 绘制指标时根据this.plot.csizeRate来区别
			this.cwidth = (this.width - options.prepareDistance) / (xLabelsNum - 1);
			this.csize = 0;
			if(data && baseValue){
				//计算所有商品的涨跌幅，取所有的最大值
				for(var i = 0, l = data.length; i < l; i++){
					if(data[i] && baseValue[i]){
						var d_ = util.minmax1d(data[i]);
						dymaxRate = Math.abs(d_[1] - baseValue[i]) / baseValue[i], dyminRate = Math.abs(d_[0] - baseValue[i]) / baseValue[i];
						maxRate = Math.max(maxRate, dymaxRate * ( 1 + options.rateNumOffset), dyminRate * ( 1 + options.rateNumOffset));
					}
				}
			}
			//如果没有数据 取默认的涨跌幅
			if(maxRate === 0){
				maxRate = options.rateNum;
			}else if(maxRate < options.rateNum){
				maxRate = options.rateNum;
			}
			
			this.ymin = 1 - maxRate;
			this.ymax = 1 + maxRate;
			this.yAxisRange = this.ymax - this.ymin;
	        this.yAxisScale = this.height / this.yAxisRange;			
		},
		//绘制主商品
		drawMain: function(){
			//是否填充
			if(this.options.timetrendFilled){
				this.fillPlot();
			}else{
				this.strokePlot();
			}
	        
		},
		fillPlot: function(){
			var ctx = this.ctx, options = this.options, baseValue = this.baseValue, data = this.data, xStart = this.xStart, yStart = this.yStart,
				halfPlot = yStart + this.height / 2, yEnd = yStart + this.height, yAxisScale = this.yAxisScale, cwidth = this.cwidth, 
				timeKey = this.timeKey, xline, y, prevxy, key, index, dataTemp;
			if(data && baseValue){
				for(var i = 0, l = data.length; i < l; i++){
					if(data[i] && baseValue[i]){
						prevxy = [];
						if(i === 0){
							ctx.save();						
				        	ctx.beginPath();
				        	ctx.globalAlpha = options.timetrendFillAlpha;
				        	ctx.strokeStyle = options.timetrend[i];
				        	ctx.lineWidth = 1;			        	
							for(var j = 0, len = data[i].length; j < len; j++ ){
								var xlo = (j * cwidth) + xStart;
								var ycl = Math.round((data[i][j] - baseValue[i]) / baseValue[i] * yAxisScale);
								j ? ctx.lineTo(options.prepareDistance + xlo,halfPlot  - ycl) : ctx.moveTo(options.prepareDistance + xlo,halfPlot  - ycl);							
								prevxy = [ xlo, halfPlot - y];
							}
							ctx.stroke();
				        	if(options.timetrendFilledColors.length == 1){
				        		ctx.fillStyle = options.timetrendFilledColors[0];
				        	}else if(options.timetrendFilledColors.length == 2){
				        		var lGrd = ctx.createLinearGradient(options.prepareDistance, yStart, options.prepareDistance, yEnd);  
					        	lGrd.addColorStop(0, options.timetrendFilledColors[0]);  
					        	lGrd.addColorStop(1, options.timetrendFilledColors[1]);
					        	ctx.fillStyle = lGrd;
				        	}
				        	ctx.lineTo(options.prepareDistance + xlo, yEnd);
							ctx.lineTo(xStart + options.prepareDistance, yEnd);
							ctx.lineTo(options.prepareDistance + xStart, yEnd);											
				        	ctx.closePath();
				        	ctx.fill();
				        	ctx.restore();
						}else{
							//叠加商品绘图
							key = timeKey[i - 1];
							dataTemp = data[i][0];
							//以主商品的数据长度作为循环个数
							for(var j = 0; j < len; j++ ){
								if(key && key[j].overlapsIndex){//叠加商品与主商品有对应的数据
									xline = (j * cwidth) + xStart;
									//叠加商品与主商品对应的数据在叠加商品中的索引位置
									index = key[j].overlapsIndex;
									y = Math.round((data[i][index] - baseValue[i]) / baseValue[i] * yAxisScale);
									util.drawline(ctx, options.prepareDistance + prevxy[0], prevxy[1], options.prepareDistance + xline, halfPlot - y, options.timetrend[i], options.backgroundGrid.lineHeight);
									prevxy = [ xline, halfPlot - y];
									dataTemp = data[i][index];
								}else{
									//叠加商品与主商品没有对应的数据 
									//取叠加商品第1个或最后一次与主商品对应的数据
									xline = (j * cwidth) + xStart;
									y = Math.round((dataTemp - baseValue[i]) / baseValue[i] * yAxisScale);
									util.drawline(ctx, options.prepareDistance + prevxy[0], prevxy[1], options.prepareDistance + xline, halfPlot - y, options.timetrend[i], options.backgroundGrid.lineHeight);
									prevxy = [ xline, halfPlot - y];
								}								
							}
						}
					}
				}
			}
		},
		strokePlot: function(){
			var ctx = this.ctx, options = this.options, baseValue = this.baseValue, data = this.data, xStart = this.xStart,
				halfPlot = this.yStart + this.height / 2, yAxisScale = this.yAxisScale, cwidth = this.cwidth, csize = this.csize, 
				timeKey = this.timeKey, xline, y, prevxy, key, index, dataTemp;
			if(data && baseValue){
				for(var i = 0, l = data.length; i < l; i++){
					if(data[i] && baseValue[i]){
						prevxy = [];
						if(i === 0){
							//主商品绘图
							for(var j = 0, len = data[i].length; j < len; j++ ){
								xline = (j * cwidth) + xStart + csize / 2;
								y = Math.round((data[i][j] - baseValue[i]) / baseValue[i] * yAxisScale);
								util.drawline(ctx, options.prepareDistance + prevxy[0], prevxy[1], options.prepareDistance + xline, halfPlot - y, options.timetrend[i], options.backgroundGrid.lineHeight);
								prevxy = [ xline, halfPlot - y];
							}
						}else if(timeKey[i - 1]){
							//叠加商品绘图
							key = timeKey[i - 1];
							//叠加商品的第一笔数据
							dataTemp = data[i][0];
							//以主商品的数据长度作为循环个数
							for(var j = 0; j < len; j++ ){
								if(key && key[j].overlapsIndex != undefined){//叠加商品与主商品有对应的数据
									xline = (j * cwidth) + xStart + csize / 2;
									//叠加商品与主商品对应的数据在叠加商品中的索引位置
									index = key[j].overlapsIndex;
									y = Math.round((data[i][index] - baseValue[i]) / baseValue[i] * yAxisScale);
									util.drawline(ctx, options.prepareDistance + prevxy[0], prevxy[1], options.prepareDistance + xline, halfPlot - y, options.timetrend[i], options.backgroundGrid.lineHeight);
									prevxy = [ xline, halfPlot - y];
									dataTemp = data[i][index];
								}else{
									//叠加商品与主商品没有对应的数据 
									//取叠加商品第1个或最后一次与主商品对应的数据
									xline = (j * cwidth) + xStart + csize / 2;
									y = Math.round((dataTemp - baseValue[i]) / baseValue[i] * yAxisScale);
									util.drawline(ctx, options.prepareDistance + prevxy[0], prevxy[1], options.prepareDistance + xline, halfPlot - y, options.timetrend[i], options.backgroundGrid.lineHeight);
									prevxy = [ xline, halfPlot - y];
								}
								
							}
						}
						
					}
				}
			}
		},
		//绘制y轴坐标
		yAxis: function(){
			//绘制横向背景线
			var ctx = this.ctx, xStart = this.xStart, xEnd = xStart+ this.width, yStart = this.yStart, height = this.height, yEnd = yStart + height,
				halfPlot = yStart + height/2, yAxisScale = this.yAxisScale, baseValue, ymin = this.ymin, ymax = this.ymax,
				options = this.options, yLabels = this.yLabels, ygridUp = [], ygridDown = [], leftLabel, rightLabel, y, fixedNum = options.fixedNum;  
			
			if(yLabels && yLabels.length){
				return;
			}
			//基准值以主商品的昨收价为主
			if(this.baseValue && this.baseValue.length){
				baseValue = this.baseValue[0];
				
				//计算背景线的个数及对应的数据
				ygridUp = util.ygrid(baseValue, baseValue * ymax, Math.floor((height / 2) / options.backgroundGrid.height));
				ygridDown = util.ygrid(ymin * baseValue, baseValue, Math.floor((height / 2) / options.backgroundGrid.height));

				//昨收价背景线及坐标
				util.drawline(ctx, xStart, halfPlot , xEnd, halfPlot , options.baseValueStyle.color, options.backgroundGrid.lineHeight);  // 画表格背景线 昨收价 横线
				util.drawText(ctx, (0).toFixed(fixedNum) + "%", xEnd, halfPlot, {align:'left', textBaseline:'middle', padding:5, color:options.label,background:options.background,  font: options.font});
				this.drawbase ? util.drawText(ctx, baseValue.toFixed(fixedNum), xStart, halfPlot, {align:"right", padding:-5, textBaseline:'middle',color:options.label,background:options.background,  font: options.font}) : null;
				
				//上半部横向背景线及坐标
				for(var i = 1, l = ygridUp.length; i < l; i++){
					leftLabel = ygridUp[i];
					rightLabel =  ((leftLabel - baseValue) / baseValue * 100).toFixed(fixedNum) + "%";
					y = halfPlot - (ygridUp[i] - baseValue) / baseValue * yAxisScale;
					util.drawText(ctx, rightLabel, xEnd, y, {align:'left', textBaseline:'middle', padding:5, color:options.yUpLabel.color,background:options.yUpLabel.background,  font: options.font});
					this.drawbase ? util.drawText(ctx, leftLabel.toFixed(fixedNum), xStart, y, {align:"right", padding:-5, textBaseline:'middle',color:options.yUpLabel.color,background:options.yUpLabel.background,  font: options.font}) : null;
	            	if(i == l -1){ //最上边的背景线不画
						continue;
					}
	            	if(options.backgroundGrid.type == 'dashed'){
	            		util.drawDashes(ctx, xStart, y , xEnd, y , options.backgroundGrid.color, options.backgroundGrid.lineHeight);  // 画表格背景线 横线 虚线
	            	}else{
	            		util.drawline(ctx, xStart, y , xEnd, y , options.backgroundGrid.color, options.backgroundGrid.lineHeight);  // 画表格背景线 横线  实线
	            	}
				}
				//下半部横向背景线及坐标
				for(var i = 0, l = ygridDown.length; i < l - 1; i++){
					leftLabel = ygridDown[i];
					rightLabel =  ((baseValue - leftLabel) / baseValue * 100).toFixed(fixedNum) + "%";
					y = halfPlot + (baseValue - ygridDown[i]) / baseValue * yAxisScale;
					if(i == 0){//最下面的背景线不画，坐标位置调整
						util.drawText(ctx, rightLabel, xEnd, y, {align:'left',textBaseline:'bottom', padding:5, color:options.yDownLabel.color,background:options.yDownLabel.background,  font: options.font});
						this.drawbase ? util.drawText(ctx, leftLabel.toFixed(fixedNum), xStart, y, {align:"right", padding:-5, textBaseline:'bottom', color: options.yDownLabel.color,background:options.yDownLabel.background,  font: options.font}) : null;
						continue;
					}
					util.drawText(ctx, rightLabel, xEnd, y, {align:'left',textBaseline:'middle', padding:5, color:options.yDownLabel.color,background:options.yDownLabel.background,  font: options.font});
					this.drawbase ? util.drawText(ctx, leftLabel.toFixed(fixedNum), xStart, y, {align:"right", padding:-5, textBaseline:'middle', color: options.yDownLabel.color,background: options.yDownLabel.background,  font: options.font}) : null;
	            	
	            	if(options.backgroundGrid.type == 'dashed'){
	            		util.drawDashes(ctx, xStart, y , xEnd, y , options.backgroundGrid.color, options.backgroundGrid.lineHeight);  // 画表格背景线 横线 虚线
	            	}else{
	            		util.drawline(ctx, xStart, y , xEnd, y , options.backgroundGrid.color, options.backgroundGrid.lineHeight);  // 画表格背景线 昨收价 横线
	            	}
				}
			}
			
		},
		//绘制x轴坐标
		xAxis: function(){
			var ctx = this.ctx, xStart = this.xStart, xEnd = xStart + this.width, yStart = this.yStart, yEnd = yStart + this.height,
				xLabels = this.xLabels, options = this.options, prepareDistance = options.prepareDistance,
				cwidth = this.cwidth, csize = this.csize, xline, accumulativeWidth = 0 ,prevy = 0;
			/**
			 * 绘制x轴labels及相关东西的逻辑
			 * 1.当绘制第一个点的时候,也就是开盘时间的时候,值为 xStart+prepareDistance+j * cwidth
			 * 2.后面的点的位置为前一个点的位置加上固定的间隔options.xLabelsInterval * cwidth
			 * 3.每一个交易时间段的收盘时间都要尽量体现,也就是当(j-options.xLabelsInterval)!=(length-1)时要去画
			 * 4.由于去除掉了重合的部分,所以从第二个时间段开始,花的第一个点为第options.xLabelsInterval-1个点的位置
			 * 5.除去第一个交易时间段的时间数据为包含全部首尾的,其他时间段的数据均为去掉开始交易时间的一个时间数组
			 * 注 : xLabels[[第一个交易时间段的时间数据],[第二个交易时间段的交易数据],[..],....]
			 */
			
			if(xLabels && xLabels.length){
				for(var i = 0, l = xLabels.length; i < l; i++){
					var length = xLabels[i].length;
					for(var j = (i ? options.xLabelsInterval-1 : 0); j < length; j += options.xLabelsInterval){
						 j==0 && i==0 ? xline = xStart + prepareDistance+j * cwidth + csize / 2 :  xline = accumulativeWidth + options.xLabelsInterval * cwidth;
						 //判断是否绘制x轴labels
						if((xline - prevy) > ctx.measureText(xLabels[i][j]).width){
							util.drawText(ctx, xLabels[i][j], xline, yEnd, {align: 'center', textBaseline: 'top', color: options.xAxisLabel.color,background: options.xAxisLabel.background, font: options.font});
							prevy = xline;
						}
						accumulativeWidth = xline;
						if(xline <= xStart || xline >= xEnd){ //左边界和右边界背景线不画
							continue;
						}
						if(options.backgroundGrid.type == 'dashed'){
							util.drawDashes(ctx, xline, yEnd , xline, yStart, options.backgroundGrid.color, options.backgroundGrid.lineHeight);  // 画表格背景线  竖线
						}else if(options.backgroundGrid.type == 'solid'){
							util.drawline(ctx, xline, yEnd , xline, yStart, options.backgroundGrid.color, options.backgroundGrid.lineHeight);  // 画表格背景线  竖线
						}
					}
					if((j-options.xLabelsInterval)!=(length-1)){
						xline = accumulativeWidth + Math.round(Math.abs(length - 1 - (j - options.xLabelsInterval)) * cwidth);
						//判断是否绘制x轴labels
						if((xline - prevy) > ctx.measureText(xLabels[i][length-1]).width){
							util.drawText(ctx, xLabels[i][length-1], xline, yEnd, {align: 'center', textBaseline: 'top', color: options.xAxisLabel.color,background: options.xAxisLabel.background, font: options.font});
							prevy = xline;
						}
						accumulativeWidth = xline;
						if(xline <= xStart || xline >= xEnd){ //左边界和右边界背景线不画
							continue;
						}
						if(options.backgroundGrid.type == 'dashed'){
							util.drawDashes(ctx, xline, yEnd , xline, yStart, options.backgroundGrid.color, options.backgroundGrid.lineHeight);  // 画表格背景线  竖线
						}else if(options.backgroundGrid.type == 'solid'){
							util.drawline(ctx, xline, yEnd , xline, yStart, options.backgroundGrid.color, options.backgroundGrid.lineHeight);  // 画表格背景线  竖线
						}	
					}
				}
			}else{
//				xLabels = this.width;
//				for(var i = 0, l = xLabels; i < l; i += options.xLabelsInterval){
//					xline = xStart + Math.round(prepareDistance + i * cwidth);
//					//判断是否绘制x轴labels
//					if((xline - prevy) > ctx.measureText(i).width){
//						util.drawText(ctx, i, xline, yEnd, {align: 'center', textBaseline: 'top', color: options.xAxisLabel.color});
//						prevy = xline;
//					}
//					
//					if(xline == xStart || xline == xEnd){ //左边界和右边界背景线不画
//						continue;
//					}
//					if(options.backgroundGrid.type == 'dashed'){
//						util.drawDashes(ctx, xline, yEnd , xline, yStart, options.backgroundGrid.color, 1);  // 画表格背景线  竖线
//					}else if(options.backgroundGrid.type == 'solid'){
//						util.drawline(ctx, xline, yEnd , xline, yStart, options.backgroundGrid.color);  // 画表格背景线  竖线
//					}
//				}
			}
			
		},
		render: function(){
			var options = this.options, offsets = this.offsets, xStart = this.xStart, yStart = this.yStart,ctx = this.ctx, plot = this.plot,
				margins = this.margins, mainLabelsArr = [], temp = '';
			//清除绘图区域
			util.clearCanvas(ctx, xStart - offsets.l -this.margins.l, yStart - offsets.t -margins.t+ 1, this.width + offsets.l + offsets.r + margins.l + margins.r + 1, this.height + offsets.t + offsets.b + margins.t + margins.b- 1, options.background);
			//绘制边框
			ctx.strokeStyle = options.stroke;
			util.drawRect(ctx, xStart, yStart, this.width, this.height, true);
			
			if(options.isDrawHead) {
				if(!options.newTxt) {
					
					//绘制默认labels
					if(this.mainLabels){
						for(var i = 0, l = this.mainLabels.length; i < l; i++){
							util.drawText(ctx, this.mainLabels[i], xStart + ctx.measureText(temp).width, yStart -1, {align: 'start', textBaseline: 'bottom', color: options.timetrend[i],background:options.background,  font: options.font});
							temp += this.mainLabels[i] + ' ';
						}
					}
					//绘制txt
					util.drawText(ctx, this.txt, xStart + ctx.measureText(temp).width, yStart -1, {align: 'start', textBaseline: 'bottom', color:options.label,background:options.background,  font: options.font});
					temp += this.txt + ' ';
					//将所有的labes存储在plot上，用来绘制主图指标时使用
					plot.mainLabels = temp;
				}else {
					//绘制自定义 头部
					this.renderTxt();
				}
			}
			
			//计算数据的最大、最小涨跌幅及比例
			this.coreRange();
			//绘制x轴及labels
			this.xAxis();
			//绘制y轴及labels
			this.yAxis();
			//绘制图形
			this.drawMain();
		},
		
		drawArrow: function(context, x, y, w, h, color,canvas){
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
				  context.drawImage(canvas,x,y-h,w,h,-w/2,-h/2,w,h);
				  context.restore();
			  }
		},
		renderTxt:function(txt){
			var options = this.options, ctx = this.ctx, xStart = this.xStart, yStart = this.yStart, offsets = this.offsets, 
				plot = this.plot, canvas = plot.canvas, data = this.data, mData = data[0], fixedNum = options.fixedNum, baseValue = this.baseValue,
				price, scale, scaleRate, vol, color, isUp, offsetL = 0, gap = 15, txtObj, font, drawArrow = this.drawArrow;
				
				
				
				//数据初始化
				price = mData && Number(mData.slice(-1)).toFixed(fixedNum);
				if(typeof price == 'undefined') {
					return;
				}
				scale = (price - baseValue).toFixed(fixedNum);
				scaleRate = (100*scale / baseValue).toFixed(fixedNum) +'%';
				vol = (plot.data.amount.slice(-1) / Math.pow(10, 8)).toFixed(fixedNum) + '亿';	
				color = scale >=0 ? {value:'#E60000',up: true} : {value:'#1FA42C',up:false};
				color.toString = function(){return this.value;};
				
				//打扫头部绘图区域
				util.clearCanvas(ctx, xStart+1,  yStart - offsets.t +1, this.width-2, offsets.t -2, options.background);
				
				//绘制头部区域
				txts = [{value:price, style:{color: String(color), font:'20px Arial bold'}}, {value: scale, style:{color: String(color)}},
				        {value:scaleRate, style:{color: String(color)}}, {value:vol, style:{color:'#8f2211'}}]; 
				for(var i in txts){
					txtObj = txts[i];
					
					font = txtObj.style.font || '10px Arial bold';
					
					util.drawText(ctx, txtObj.value, xStart + offsetL, yStart - 1, {align: 'start', textBaseline: 'bottom', color: txtObj.style.color, font: font, background : options.background,  font: options.font});
					offsetL = (ctx.measureText(txtObj.value).width + offsetL + gap); //偏移累计
					if(Number(i) ==0) {
						drawArrow(ctx, xStart + offsetL - gap/2, yStart -4, 20, 20, color,canvas); //绘制箭头
						offsetL += 20;
					}
				}
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
			var keyArr = this.getTimeKey();
			keyArr[i] = key;
		},
		getTimeKey: function(){
			return this.timeKey;
		},
		setData: function(data, i){
			//data = [[], []]
			var dataArr = this.getData();
			
			dataArr[i] = data;
		},
		getData: function(){
			return this.data;
		},
		setBaseValue: function(value){
			//value = []
			this.baseValue = value;
			this.drawbase = true;
		},
		getBaseValue: function(){
			return this.baseValue;
		},
		setXLabels: function(labels){
			//labels = []
			this.xLabels = labels;
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
		_getLabelsLength : function(){
			var length = 0;
			for(var i = 0;i<this.xLabels.length ; i++){
				length+=this.xLabels[i].length;
			}
			return length;
		},
		clear : function(){
//			this.xLabels = [];
//			this.yLabels = [];
			this.data = [];
			this.timeKey = [];
		}
	})
	
	return sharingPlan;
	
})