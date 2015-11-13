/**
 * Created by Yuan on Sep/2015.
 */

var InputTestWebApp = (function(){
    document.write(window.PointerEvent);
	$ul = $("#input_test_ul");
    $canv = $("#input_test_canvas");
    /*$canv.mousedown(
        function(event){
            AddLi("mouse", "Dn", StringifyMouseType(event.which), event.clientX, event.clientY);
        }
    );*/
	$canv.get(0).addEventListener('pointerdown', function(event) {
        event.preventDefault();
        addListPointer(event,"Dn");     
    }, false);
	$canv.get(0).addEventListener('pointerup', function(event) {
        event.preventDefault();
        addListPointer(event,"Up");     
    }, false);
	$canv.get(0).addEventListener('pointerenter', function(event) {
        event.preventDefault();
        addListPointer(event,"En");     
    }, false);
	$canv.get(0).addEventListener('pointerout', function(event) {
        event.preventDefault();
        addListPointer(event,"Out");     
    }, false);
	$canv.get(0).addEventListener('pointermove', function(event) {
        event.preventDefault();
		ReplaceListPointer(event,"Mv");
        //addListPointer(event,"Mv");     
    }, false);
	$canv.get(0).addEventListener('pointerover', function(event) {
        event.preventDefault();
        addListPointer(event,"Over");     
    }, false);
    function addListPointer(e,curCmd) {
		var endev ="";
		var entyp ="";
		switch (e.pointerType) {
			case "mouse":
				entyp += StringifyMouseType(e.buttons);
				break;
			case "pen":
				break;
			case "touch":
				break;
			default:
				break;
		}
		AddLi(e.pointerType, curCmd , entyp, e.offsetX, e.offsetY);
	}
	function ReplaceListPointer(e,curCmd) {
		var endev ="";
		var entyp ="";
		switch (e.pointerType) {
			case "mouse":
				entyp = StringifyMouseType(e.buttons);
				break;
			case "pen":
				if(e.pressure>0.1){
					entyp="press";
				}
				else{
					entyp="hover";
				}
				break;
			case "touch":
				break;
			default:
				break;
		}
		ReplaceLi(e.pointerType, curCmd , entyp, e.offsetX, e.offsetY);
	}
/*
    $canv.get(0).addEventListener('touchend', function(event) {
        event.preventDefault();
        for(var i = 0; i < event.changedTouches.length; ++i){
            var touch = event.changedTouches[i];
            AddLi("touch", "Up", touch.identifier, touch.clientX, touch.clientY);
        }
    }, false);
*/
    function StringifyMouseType(n){
        var rtn;
        switch(n){
            case 0:
                rtn = "HOVR";
                break;
            case 1:
                rtn = "LEFT";
                break;
            case 2:
                rtn = "MDLE";
                break;
            case 3:
                rtn = "RGHT";
                break;
            default:
                rtn = n.toString();
                break;
        }
        return rtn;
    }

    function AddLi(device, action, type, x, y, i){
        $li = $(document.createElement("li"));
        $li.css("list-style-type", "none");
        var s = "";
        s += device;
        s += ", ";
        s += action;
        s += ", ";
        s += type;
        s += ", ";
        s += x.toFixed(2);
        s += ", ";
        s += y.toFixed(2);

        $li.text(s);
        $li.attr("device",device);
        $li.attr("action",action);
        $li.attr("type",type);
        if(typeof i === "undefined"){
            $ul.prepend($li);
        }
        else{
            $ul.children().eq(i).after($li);
        }

    }
    function ReplaceLi(device, action, type, x, y){
        if($ul.children().length>0){
            $li = $ul.children().first();
            if( $li.attr("device") == device &&
                $li.attr("action") == action &&
                $li.attr("type") == type){
                AddLi(device, action, type, x, y, 0);
                $ul.children().first().remove();
                return;
            }
        }
        AddLi(device, action, type, x, y);
    }

})();
