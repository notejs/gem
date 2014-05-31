/** @module dojox/customfig/Plot */
define(["../main", "dojo/_base/declare", "dijit/_WidgetBase", "dojo/_base/lang", "dojo/dom", "dojo/dom-geometry", 
        "./utils", 'dojo/cssScale', "dojox/customfig/themes/Theme"],
	function(dojox, declare, _WidgetBase, lang, dom, domGeom, util, cssScale, Theme){
	
	var dc = lang.getObject("customfig", true, dojox);
	/** @class Plot 绘图对象类  */
	var plot = declare("dojox.customfig.Plot", [_WidgetBase], {
		
		kwArgs: {
			margins: {l: 2, t: 2, r: 2, b: 2},
			offsets: {l:70, t: 10, r: 70, b: 10},
			noscale: true //是否缩放
		},
		
		/** @constructor Plot
		  @param {object} kwArgs 参数对象*/
		constructor: function(kwArgs){
			this.kwArgs = lang.mixin({}, this.kwArgs, kwArgs || {});
			/** mainIndicators {object} 主图指标 */
			this.mainIndicators = {};
			/** mainIndicatorsNum {object} 主图个数 */
			this.mainIndicatorsNum = 0;
			/** indicators [object,附图指标] */
			this.indicators = {};
			this.indicatorsNum = 0;
			/** 存储所有的数据 */
			this.data = {};
		},
		/**
			postCreate
		 */
		postCreate: function(){
			var box = domGeom.getMarginBox(this.domNode);
			this.initCanvas(box);
			if(!this.theme){
				this.theme = new Theme();
			}
		},
		initCanvas: function(size){
			var kwArgs = this.kwArgs;
			if(!this.canvas){
				this.canvas = util.createCanvas(this.domNode);
				this.ctx = this.canvas.getContext("2d");
			}
			/** 不缩放 */
			if(!this.noscale){
				this.canvas.height =  size.h;
				this.canvas.width = size.w;
				this.canvas.style['-webkit-transform-origin'] = "";
				this.canvas.style['-webkit-transform'] = "";
			}else{
				this.canvas.height =  cssScale.scaleMul(size.h,"y");
				this.canvas.width = cssScale.scaleMul(size.w,"x");
				this.canvas.style['-webkit-transform-origin'] = "left top";
				this.canvas.style['-webkit-transform'] = "scale(" + 1 / cssScale.getScaleX() + "," + 1 / cssScale.getScaleY() + ")";
			}
			this.plotHeight = this.canvas.height - kwArgs.margins.t - kwArgs.margins.b;
			this.plotWidth = this.canvas.width - kwArgs.margins.l - kwArgs.margins.r;
		},
		setTheme : function(theme){
			this.theme = theme;
		},
		/**添加主图
		@param Main
		@return Plot this
		*/
		addMain: function(main){
			if(this.main){
				this.main.destroy();
			}
			this.main = main;
			return this;
			
		},
		/**添加主图指标
		@param Indicator mainIndicator
		@return Plot this
		*/
		addMainIndicator: function(mainIndicator){
			var type = mainIndicator.type;
			if(type in this.mainIndicators){
				this.mainIndicatorsNum -= 1;
				this.mainIndicators[type].destroy();
			}
			this.mainIndicators[type] = mainIndicator;
			this.mainIndicatorsNum += 1;
			return this;
			
		},
		/**删除主图指标
		@param [macd,] type
		*/
		delMainIndicator: function(type){
			if(type in this.mainIndicators){
				this.mainIndicatorsNum -= 1;
				this.mainIndicators[type].destroy();
				delete this.mainIndicators[type];
				this.render();
			}
		},
		/**添加附图指标
		@param Indicator indicator
		@return Plot this
		*/
		addIndicator: function(indicator){
			var type = indicator.type;
			if(type in this.indicators){
				this.indicatorsNum -= 1;
				this.indicators[type].destroy();
			}
			this.indicators[type] = indicator;
			this.indicatorsNum += 1;
			return this;
			
		},
		/** 设置数据，原始数据 */
		setData: function(data){
			lang.mixin(this.data, data);
		},
		/** 获取数据 */
		getData: function(){
			return this.data;
		},
		/**删除附图指标
		@param [macd,] type,
		*/
		delIndicator: function(type){ 
			if(type in this.indicators){
				this.indicatorsNum -= 1;
				this.indicators[type].destroy();
				delete this.indicators[type];
				this.render();
			}
		},
		/**绘图区域的划分
		*/
		divideRegion: function(){
			var main = this.main, indicators = this.indicators, mainIndicators = this.mainIndicators, kwArgs = this.kwArgs,
				mainIndicatorsNum = this.mainIndicatorsNum, margins = kwArgs.margins, offsets = kwArgs.offsets,
				mainPlot, eachPlotHeight,regionNum = this.indicatorsNum;
			//判断主图或主图指标是否存在
			if(main || mainIndicatorsNum){
				regionNum += 2;
				eachPlotHeight = (this.plotHeight - offsets.t - offsets.b) / regionNum;
				mainPlot = {
					ctx: this.ctx,
					offsets: offsets,
					height: eachPlotHeight * 2,
					width: this.plotWidth - offsets.l - offsets.r,
					yStart: margins.t + offsets.t,
					xStart: margins.l + offsets.l,
					theme: this.theme ,
					margins : this.kwArgs.margins
				}
				if(main){
					main.setGeometry(mainPlot);
				}
				for(var mainInd in mainIndicators){
					mainIndicators[mainInd].setGeometry(mainPlot);
				}
			}else{
				eachPlotHeight = (this.plotHeight - offsets.t - offsets.b) / regionNum;
			}
			
			var i = 0;
			for(var indicator in indicators){
				indicators[indicator].setGeometry({
					ctx: this.ctx,
					offsets: offsets,
					height: eachPlotHeight,
					width: this.plotWidth - offsets.l - offsets.r,
					yStart: margins.t + offsets.t + (mainPlot ? (i + 2) * eachPlotHeight : i * eachPlotHeight),
					xStart: margins.l + offsets.l,
					theme: this.theme ,
					margins : this.kwArgs.margins
				})
				i++;
			}
			
			
		},
		/**渲染图形(渲染主图、附图)
		*/
		render: function(){
			
			var main = this.main, indicators = this.indicators, mainIndicators = this.mainIndicators;
			this.divideRegion();
			//主图render
			if(main){
				main.render();
			}
			//主图指标render
			for(var mainInd in mainIndicators){
				mainIndicators[mainInd].render();
			}
			//附图指标render
			for(var indicator in indicators){
				indicators[indicator].render();
			}
			
		},
		resize: function(newSize, currentSize){
			if(newSize){
				domGeom.setMarginBox(this.domNode,{w: newSize.w, h: newSize.h});
				var box = domGeom.getMarginBox(this.domNode);
				this.initCanvas(box);
				this.render();
			}
		},
		clear : function(){
			var main = this.main, indicators = this.indicators, mainIndicators = this.mainIndicators;
			if(main){
				main.clear();
			}
			//主图指标render
			for(var mainInd in mainIndicators){
				mainIndicators[mainInd].clear();
			}
			//附图指标render
			for(var indicator in indicators){
				indicators[indicator].clear();
			}
		}
	})
	
	return plot;
	
})