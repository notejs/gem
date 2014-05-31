/** @module dojox/customfig/Element */
define(["dojo/_base/declare", "dojo/_base/lang"],
	function(declare, lang){	
	 
	var element = declare("dojox.customfig.Element", null, {
		 /** 
		 实例化 Element 类
		 @constructor  Element
		  @param {object} plot Plot 类实例(用于绘图)
		  @param {object} kwArgs 参数对象*/
		constructor: function(plot, kwArgs){
			this.plot = plot;
			this.options = {};
		}
	})	
	return element;
	
})