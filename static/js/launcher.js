function init(sp_local, sp_content)
{
	console.log("Init");
	SP_LOCAL = sp_local;
	SP_CONTENT = sp_content;
	
	PAGE = new Page()
}

class Page
{
	constructor()
	{
		this.$tileboxes = $('.tilebox-outer');
		this.descs = [];
		this.current_n = 1; // The current number of tiles in a row.
		//This is where each app is declared. To add a new app:
		//1 - Add to the list below
		//2 - Add a tile in the HTML (with a reference to the image). Make sure the id's match.
		this.applist = [
			{$dom: $('#reginald'), desc: "Reginald is an app that helps keep track of your finances. Many apps like this exist, but Reginald specializes in being extremely lightweight and mobile. Simple interfaces allow for the entry of expenses or income, while a sleek graphing tool (the greensheet) allows for an easy overview of recent finances."},
			{$dom: $('#untether'), desc: "Untether is a very lightweight app which simply takes notes. However, notes can be taken from anywhere extremely painlessly and are kept in a centralized, easily-retrievable way."},
			{$dom: $('#voyager'), desc: "Do you ever learn about a place or thing that you'd like to see/do/view/experience one day? Voyager is an app which helps you keep track of these places. Later, when planning a trip or traveling in a region you can use Voyager's map feature to recover nearby interesting places and things you recorded long ago."},
			{$dom: $('#morpheus'), desc: "Morpheus's Colusseum of Intellectual Ridicule is a happy place."}
		];
		var _this = this;
		
		for(var x = 0; x < this.applist.length; x++)
		{
			this.applist[x].$dom.hover(function(c_ref) //Handler in
			{
				return function()
				{
					_this.descDisplay(c_ref, _this.applist[c_ref].desc);
				}
			}(x), function(c_ref)
			{
				return function() //Handler out
				{
					_this.descRemAll();
				}
			}(x));
			
		}
		
		$(window).resize(function ()
		{
			//Note, this can be called continuously or at the end of a resize, depending on browser.
			PAGE.onResize();
		});
		this.onResize();
	}
	
	//Called when the window resizes
	onResize()
	{
		var _this = this;
		//Width of outer box
		this.$tileboxes.each(function(index)
		{
			var tbout = $(this);
			var tbin = tbout.find('.tilebox-inner').first();
			var tbtile = tbin.children().first(); //Not using find because multiple tile types possible
			var wiface = tbout.width();
			var wtile = tbtile.outerWidth(true);
			var n = Math.floor(wiface / wtile);
			_this.current_n = n;
			
			tbin.width(n * wtile + 10);
			tbin.css('min-width', wtile + "px")
			tbin.css('max-width', (n * wtile + 10) + "px")
		});
	}
	
	//Displays a description 
	descDisplay(index, desc)
	{
		var $desc = $('<div></div>').addClass('tilebox-tile-app-desc').html(desc).css('display', 'none');
		this.descs.push($desc);
		var insert_index = index + ((1 + index) % this.current_n)
		insert_index = insert_index > this.applist.length - 1 ? this.applist.length - 1: insert_index
		this.applist[insert_index].$dom.after($desc);
		$desc.finish().slideDown();
	}
	
	//Deletes all descriptions
	descRemAll()
	{
		for(var x = 0; x < this.descs.length; x++)
		{
			this.descs[x].finish().slideUp(100, function()
			{
				$(this).remove();
			});
		}
	}
}