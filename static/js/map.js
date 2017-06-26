/*
/map.js

This javascript is a framework for transitioning between a large number of 'nodes', where a node can be several things:
	- a webpage
	- an images
	- a simple list or text file
	- a web app

You get the idea.

Launching this javascript from an HTML page will essentially remove the entire <body> and <head> and replace it
with some custom HTML which renders the map. This whole process is jquery intensive, but that's just how it has to be.
*/

//Called by html when the script loads (not actually called in this script)
function init(sp_local, sp_content)
{
	PAGE = new Page();
	//setTimeout(function() {PAGE.reload('http://68.63.166.219:5000/about');}, 1000);
}

//The top level page class. This should be the only top level variable.
class Page
{
	constructor(sp_local, sp_content)
	{
		//Setup root paths from server.
		this.sp_local = sp_local;
		this.sp_content = sp_content;
	}
	
	//Reloads the current page's body and head with another page's body and head.
	reload(link)
	{
		$.get(link, null, function(data)
		{
			var $html = $.parseHTML(data);
			console.log($html);
			console.log($('html'));
		});
	}
}




























































