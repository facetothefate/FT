# FT
Functional Template, use pure function to describe template

## Quick start

With FT, you can define pure template function:

```
template T(decs:String){
	<p>#decs#</p>
}
```
Define the template function is easy, provide the name and arguments.
Please be advised that a FT function have type check for its arguments, you should declare a type for each argument.

For now the javascript version we have the following types support

 - Number
 - String
 - Boolean
 - Object
 - Array
 - Function
 - Date
 - Error
 - RegExp

The string between two "#" should be a <b>javascript expression</b>, the FT will compute the value of it and concat other parts.

Use the render method to call the template function:

```javascript
var ft = require('ft'); //for node, but also you can use it at front end
ft.render(
	"path/to/file", 	// path to your template file
	"T",// the template funtion you want to call
	["Hello world!"], 	//the argument you want to provide to the template funtion, it should be an Array
	function(res){		//Once the render compelete, it will call your callback here with render result
		//do something with the res!
	}
);
``` 

## Never write if/for/while

A template function of FT is a pure funtion, it supports the pattern match, so you will never need an if

```
template li(type:Number){
	<li>This is for other type</li>
}
template li(type==1){
	<li>This is for type 1 </li>
}
template li(type==2){
	<li>This is for type 2 </li>
}
template ul(type:Number){
	<ul>
		#this.li(type)#
	</ul>
}
```
You can call the template function inside a template function by the <b>this</b> pointer

You don't need a "while" since we have template functions

```
template fab(n:Number){
	#parseInt(this.fab(n-2))+parseInt(this.fab(n-1))#
}
template fab(n<0){
	0
}
template fab(n==0){
	0
} 
template fab(n==1){
	1
}
``` 

A template function always returns a string, don't forget cast the type

We also provide some build in functions for you to handle the loop


```
template li(n:Number){
	<li>#n#</li>
}
template ol_range(){
	<ol>
		#this.map(this.range(5,10),this.li)#
	</ol>
}
template ol_loop(){
	<ol>
		#this.loop(10,this.li)#
	</ol>
}
```

- <b>range(start:Number,end:Number)</b>    This function will return an array which have elements [start,end)
- <b>loop(num:Number,stepper:Function)</b> This function will call the stepper with an argument in [0,num) num times
- <b>map(data:Array,stepper:Function)</b>  This function will get each item in the array and call the stepper by providing item as its argument

So call the ol_range, you will have

```html
	<ol>
	<li>5</li><li>6</li><li>7</li><li>8</li><li>9</li>
	</ol>
``` 
Call the ol_loop, you will have 

```html
	<ol>
	<li>0</li><li>1</li><li>2</li><li>3</li><li>4</li><li>5</li><li>6</li><li>7</li><li>8</li><li>9</li>
	</ol>
```

## Import
Coming soon

## Contribute

Issues, Issues, Issues！

The javascript source code is using standard js
http://standardjs.com/

Also, I have a circle CI for this project
https://circleci.com/gh/facetothefate/FT
