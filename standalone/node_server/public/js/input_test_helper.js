/**
 * Created by dongwook on 4/6/15.
 */

var InputTestWebApp = (function(){
    $ul = $("#input_test_ul");
    $canv = $("#input_test_canvas");
    $canv.mousedown(
        function(event){
            //AddLi("mouse", "Dn", StringifyMouseType(event.which), event.clientX, event.clientY);
        }
    );
    $canv.mouseup(
        function(event){
            //AddLi("mouse", "Up", StringifyMouseType(event.which), event.clientX, event.clientY);
        }
    );
    $canv.mousemove(
        function(event){
            //ReplaceLi("mouse", "Mv", StringifyMouseType(event.which), event.clientX, event.clientY);
        }
    );

    $canv.get(0).addEventListener('pointerdown', function(event) {
        event.preventDefault();
        console.log(event);
        AddLi("pointer", "Dn", StringifyMouseType(event.which), event.clientX, event.clientY);
    }, false);

    $canv.get(0).addEventListener('pointermove', function(event) {
        event.preventDefault();
        ReplaceLi("pointer", "Mv", StringifyMouseType(event.which), event.clientX, event.clientY);
    }, false);

    $canv.get(0).addEventListener('pointerup', function(event) {
        event.preventDefault();
        AddLi("pointer", "Up", StringifyMouseType(event.which), event.clientX, event.clientY);
    }, false);

    $canv.get(0).addEventListener('touchstart', function(event) {
        event.preventDefault();
		touchnowX = event.changedTouches[0].clientX;
		touchnowY = event.changedTouches[0].clientY;
        for(var i = 0; i < event.changedTouches.length; ++i){
            var touch = event.changedTouches[i];

            AddLi("touch", "Dn", touch.identifier, touch.clientX, touch.clientY);
        }
    }, false);

    $canv.get(0).addEventListener('touchmove', function(event) {
        event.preventDefault();
		var touch1 = event.changedTouches[0];
		$(window).moveBy(touch1.clientX-touchnowX,touch1.clientY-touch0.touchnowY);
		touchnowX = touch1.clientX;
		touchnowY = touch1.clientY;
        for(var i = 0; i < Math.min(1, event.changedTouches.length); ++i){
            var touch = event.changedTouches[i];
            ReplaceLi("touch", "Mv", event.pressure, touch.clientX, touch.clientY);
        }
    }, false);

    $canv.get(0).addEventListener('touchend', function(event) {
        event.preventDefault();
        for(var i = 0; i < event.changedTouches.length; ++i){
            var touch = event.changedTouches[i];
            AddLi("touch", "Up", touch.identifier, touch.clientX, touch.clientY);
        }
    }, false);

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
