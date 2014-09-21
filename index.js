/*

PARAMETROS CONFIGURABLES

*/
// Web service empleado para cargar fotos por parte de los usuarios
var _url_photo = 'http://bogotaverde.azurewebsites.net/Reporte.ashx?cmd=cargar_imagen';
// Web service empleado para realizar el reporte 
var _url_msg = 'http://bogotaverde.azurewebsites.net/Reporte.ashx?cmd=crear_reporte';
var _freebase_url = 'http://bogotaverde.azurewebsites.net/Reporte.ashx?cmd=freebase';
var _freebase_ur_topic = 'http://bogotaverde.azurewebsites.net/Reporte.ashx?cmd=freebase_topic';
var _proxy_url = 'http://idecabogota.appspot.com/tmp.jsp';
var _geometry_url = 'http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer';
var _map_url = 'http://imagenes.catastrobogota.gov.co/arcgis/rest/services/CM/CommunityMap/MapServer';
// Ubicación de los mapas a consultar
var _service_url = 'http://mapas.catastrobogota.gov.co/arcgis/rest/services/Tematicas/Parques/MapServer';
// Capas a consultar (asociado con las direcciones de los mapas a consultar)
var _service_layers = [0];
// Radio de búsqueda (por defecto)
var radius = 0.5;

var map;
var loaded = false;
var gl;
var gsvc;
var capa;
var color_capa = { r: 4, g: 130, b: 14, a: 0.45 };
var popup;
var headerGeom;
var bufferCache;
var mapLock = false;
var photoURLS = new Array();

var pLat = 4.595243019951048;
var pLng = -74.10301862877772;

var currentExtent;
var currentPoint;
var pressTimer;
var evtParams;

var tipos;
var cache_data;
var tcache_data;

function init() {

    if (isPhoneGapExclusive()) {
        if ((navigator.network.connection.type == Connection.UNKNOWN) || (navigator.network.connection.type == Connection.NONE)) {
            $('#msgTXT').html('Tu Bogot&aacute; requiere una conexi&oacute;n de datos para funcionar correctamente. Por favor, verifique su configuraci&oacute;n de red e intente nuevamente.');
            $('#msg').popup('open');
            return;
        };
        document.addEventListener("backbutton", function () {
            if ($(".ui-page-active .ui-popup-active").length > 0) {
                $('#reportar').popup('close');
                $('#configuracion').popup('close');
                $('#acerca').popup('close');
                $('#msg').popup('close');
                $('#msg2').popup('close');
                $('#info').popup('close');
                $('#popupGeneral').popup('close');
            } else {
                navigator.app.exitApp();
            };
        }, true);
    }

    updateSize();

    popup = new esri.dijit.InfoWindowLite(null, dojo.create("div"));
    popup.startup();

    if (isPhoneGap()) {

        map = new esri.Map("map", {
            zoom: 7,
            infoWindow: popup,
            autoresize: true
        });

        $("#fphoto").show();
        $("#fphotoweb").hide();

        dojo.connect(map, "onLoad", mapLoadHandler);
        dojo.connect(map, "onClick", mapClickHandler);
    } else {
        map = new esri.Map("map", {
            zoom: 7,
            nav: true,
            infoWindow: popup,
            autoresize: true
        });

        $("#fphoto").hide();
        $("#fphotoweb").show();

        dojo.connect(map, "onLoad", mapLoadHandler);
        dojo.connect(map, "onClick", mapClickHandler);
    };

    esri.config.defaults.io.proxyUrl = _proxy_url;
    var streetMapLayer = new esri.layers.ArcGISTiledMapServiceLayer(_map_url);
    gsvc = new esri.tasks.GeometryService(_geometry_url);
    map.addLayer(streetMapLayer);
    map.resize();
}

function initReporte() {
    photoURLS = new Array();
    $('#ffield').html('Foto: ' + photoURLS.length);
    $('#fdescripcion')[0].value = "";
    $('#fnombre')[0].value = "";
    $('#ftelefono')[0].value = "";
    $('#fcorreo')[0].value = "";
};

function displayLista() {
    $('#lista').toggle();
    updateSize();
}

function updateSize() {
    if ($("#lista").is(":visible")) {
        $("#lista").height(parseInt($(document).height() * 0.3));
    } else {
        $("#lista").height(0);
    };
    var the_height = $(window).height() - $("#header").height() - $("#lista").height() - 8;
    $("#map").height(the_height);
    if (map) {
        map.reposition();
        map.resize();
    }
};

function updateRadius(val) {
    radius = val;
}

function cerrarPopup() {
    popup.hide();
};

function mapLoadHandler(map) {
    map.disableDoubleClickZoom();
    map.infoWindow.resize(150, 100);

    loaded = true;
    gl = new esri.layers.GraphicsLayer();
    var sr = new esri.renderer.SimpleRenderer(
             new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID,
                              new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([255, 0, 0, 0.5]), 2),
                                                       new dojo.Color([255, 0, 0, 0.5])));
    gl.setRenderer(sr);
    map.addLayer(gl, 0);

    capa = new esri.layers.GraphicsLayer();
    map.addLayer(capa, 1);

    currentPoint = new esri.geometry.Point(pLng, pLat, map.spatialReference);
    map.centerAndZoom(currentPoint, 7);
};

function zoomToLocation(position) {
    pLat = position.coords.latitude;
    pLng = position.coords.longitude;

    if ((pLng < -75.58139209627889) || (pLng > -72.89593240509883) || (pLat < 3.7257132160042237) || (pLat > 5.866752229050312)) {
        return;
    }

    try {
        currentPoint = new esri.geometry.Point(position.coords.longitude, position.coords.latitude, map.spatialReference);
        map.centerAndZoom(currentPoint, 7);

        gl.add(new esri.Graphic(currentPoint,
                           new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 13,
                           new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color("#000000"), 2),
                           new dojo.Color("#FF0000")),
                           null, null));
    } catch (ex) {

    }
};

function mapClickHandler(evt) {
    if (isPhoneGapExclusive()) {
        if ((navigator.network.connection.type == Connection.UNKNOWN) || (navigator.network.connection.type == Connection.NONE)) {
            $('#msgTXT').html('Bogot&aacute;Verde requiere una conexi&oacute;n de datos para funcionar correctamente. Por favor, verifique su configuraci&oacute;n de red e intente nuevamente.');
            $('#msg').popup('open');
            return;
        };
    }

    if ((evt.mapPoint.x < -75.58139209627889) || (evt.mapPoint.x > -72.89593240509883) || (evt.mapPoint.y < 3.7257132160042237) || (evt.mapPoint.y > 5.866752229050312)) {
        $('#msgTXT').html('El punto seleccionado esta fuera de la cobertura de Bogot&aacute;Verde. Por favor, seleccione un punto en Bogot&aacute;.');
        $('#msg').popup('open');
        return;
    };

    if (mapLock) {
        return;
    };
    mapLock = true;
    gl.clear();
    map.infoWindow.hide();
    if (!($("#lista").is(":visible"))) {
        displayLista();
    };
    capa.clear();

    var mapPoint;
    mapPoint = evt.mapPoint;
    currentPoint = evt.mapPoint;
    var polygon;
    gl.add(new esri.Graphic(evt.mapPoint,
                               new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 13,
                               new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color("#000000"), 2),
                               new dojo.Color("#000000")),
                               null, null));

    var params = new esri.tasks.BufferParameters();
    params.geometries = [evt.mapPoint];
    params.distances = [radius];
    params.unit = esri.tasks.GeometryService.UNIT_KILOMETER;
    params.outSpatialReference = map.spatialReference;

    gsvc.buffer(params, showBuffer);

    var params1 = new esri.tasks.BufferParameters();
    params1.geometries = [evt.mapPoint];
    params1.distances = [Math.sqrt(radius * radius + radius * radius) / 2];
    params1.unit = esri.tasks.GeometryService.UNIT_KILOMETER;
    params1.outSpatialReference = map.spatialReference;

    gsvc.buffer(params1, showBuffer2);
    setTimeout(function () { mapLock = false; }, 4000);    
};

function showBuffer(geometries) {
    bufferCache = geometries[0];
    var symbol = new esri.symbol.SimpleFillSymbol(
            esri.symbol.SimpleFillSymbol.STYLE_SOLID,
            new esri.symbol.SimpleLineSymbol(
              esri.symbol.SimpleLineSymbol.STYLE_SOLID,
              new dojo.Color([0, 0, 255, 0.25]), 2
            ),
            new dojo.Color([0, 0, 255, 0.25])
          );
    dojo.forEach(geometries, function (geometry) {
        var graphic = new esri.Graphic(geometry, symbol);
        gl.add(graphic);
    });
};

function showBuffer2(geometries) {

    dojo.forEach(geometries, function (geometry) {
        currentExtent = geometry;

        var identifyTask = new esri.tasks.IdentifyTask(_service_url);
        var identifyParams = new esri.tasks.IdentifyParameters();
        identifyParams.spatialReference = map.spatialReference;
        identifyParams.mapExtent = currentExtent.getExtent();
        // identifyParams.geometry = currentPoint;
        identifyParams.geometry = currentExtent.getExtent();
        identifyParams.layerOption = esri.tasks.IdentifyParameters.LAYER_OPTION_ALL;
        identifyParams.tolerance = 20;
        identifyParams.maxAllowableOffset = 0.0001;
        identifyParams.returnGeometry = true;
        identifyParams.layerIds = _service_layers;
        identifyParams.width = 16000;
        identifyParams.height = 16000;
        identifyParams.dpi = 96;

        identifyTask.execute(identifyParams, function (results) {
            showResults(results);
        }, function (error) {
            alert("ERROR")
        });

    });
}

function orientationChanged() {
    if (map) {
        map.reposition();
        map.resize();
    }
}

function showResults(results) {
    tipos = [];

    for (var i = 0, il = results.length; i < il; i++) {
        var value = "Parque";
        var content = "";

        value = "Parque";
        content = results[i].feature.attributes["Nombre"];
        content = content + "<br /><a href='#' onclick='cerrarPopup();' style=''>Cerrar</a>";
        var popcontent;
        if (value.length > 40) {
            value = value.substr(0, 40) + "...";
        }
        if (value == "N/A") {
            popcontent = null;
        } else {
            popcontent = new esri.InfoTemplate(value, content)
        };
        switch (results[i].feature.geometry.type) {
            case "point":
                capa.add(new esri.Graphic(results[i].feature.geometry,
                                                new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 13,
                                                                               new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color(color_capa), 2),
                                                                               new dojo.Color(color_capa)),
                                                results[i].feature.attributes,
                                                popcontent
                                ));
                break;
            case "multipoint":
                capa.add(new esri.Graphic(results[i].feature.geometry,
                                                new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 13,
                                                                               new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color(color_capa), 2),
                                                                               new dojo.Color(color_capa)),
                                                results[i].feature.attributes,
                                                popcontent
                                ));
                break;
            case "polyline":
                capa.add(new esri.Graphic(results[i].feature.geometry,
                                                new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color(color_capa), 2),
                                                results[i].feature.attributes,
                                                popcontent
                                ));
                break;
            case "polygon":
                capa.add(new esri.Graphic(results[i].feature.geometry,
                                                new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID,
                                                                              new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color(color_capa), 2),
                                                                               new dojo.Color(color_capa)),
                                                results[i].feature.attributes,
                                                popcontent
                                ));
                break;
            case "extent":
                capa.add(new esri.Graphic(results[i].feature.geometry,
                                                new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID,
                                                                              new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color(color_capa), 2),
                                                                               new dojo.Color(color_capa)),
                                                results[i].feature.attributes,
                                                popcontent
                                ));
                break;
        }
    }
    showEntidades();    

};

function showEntidades() {
    tcache_data = {};
    $.ajax({
        url: "http://www.arcgis.com/sharing/content/items/51f35b10bc7e40948ddcd4d0b84e52f3/data",
        type: 'GET',
        dataType: 'json',
        success: function (response) {
            tipos = [];

            for (var i = 0, il = response.operationalLayers[0].featureCollection.layers[0].featureSet.features.length; i < il; i++) {
                var _result = response.operationalLayers[0].featureCollection.layers[0].featureSet.features[i];
                var value = "";
                var content = "";

                try {
                    tcache_data[_result.attributes["NOMBRE_CIE"]] = _result.attributes["Nombre_Esp"];
                    value = _result.attributes["Nombre_Esp"];
                    content = "Codigo: " + _result.attributes["Codigo_Arb"];
                    tipos.push(_result.attributes["NOMBRE_CIE"]);
                } catch (e) {
                    alert(e);
                };
                content = content + "<br /><a href='#' onclick='cerrarPopup();' style=''>Cerrar</a>";
                var popcontent;
                if (value.length > 40) {
                    value = value.substr(0, 40) + "...";
                }
                if (value == "N/A") {
                    popcontent = null;
                } else {
                    popcontent = new esri.InfoTemplate(value, content)
                };
                capa.add(new esri.Graphic(esri.geometry.webMercatorToGeographic(new esri.geometry.Point(_result.geometry.x, _result.geometry.y, new esri.SpatialReference({ wkid: 102100 }))),
                                                         new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 13,
                                                                                        new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color(color_capa), 2),
                                                                                        new dojo.Color(color_capa)),
                                                         _result.attributes,
                                                         popcontent
                                         ));


            }

            var tcache = tipos;
            tipos = tipos.filter(function (v, i, a) { return a.indexOf(v) == i }).sort();
            $("#table").html("");
            var strHTML = "";
            var params = "";
            for (var j = 0; j < tipos.length; j++) {
                strHTML = strHTML + "<tr onclick='showLayer(" + j + ");'  id='linea-" + j + "' class='lineaTR'>";
                strHTML = strHTML + "<td><span style='margin-right: 10px;'>";
                strHTML = strHTML + count(tcache, tipos[j]);
                strHTML = strHTML + "</span></td>";
                strHTML = strHTML + "<td>";
                strHTML = strHTML + tcache_data[tipos[j]];
                strHTML = strHTML + "</td>";
                strHTML = strHTML + "<td id='linea-" + j + "-l' style='float: right;'>";
                strHTML = strHTML + "</td>";
                strHTML = strHTML + "</tr>";
                params = params + tipos[j] + ",";
            };
            $("#table").html(strHTML);
            $.ajax({
                url: _freebase_url + "&params=" + params,
                type: 'POST',
                dataType: 'text',
                success: function (response) {
                    cache_data = response.split(",");
                    for (var k = 0; k < cache_data.length; k++) {
                        if (cache_data[k].length > 0) {
                            $("#linea-" + k + "-l").html('<a href="#" class="ui-btn ui-icon-info ui-btn-icon-notext  ui-corner-all" style="margin: 0px; padding: 0px;" onclick="showDetails(' + k + ');">Mas informaci&oacute;n</a>');
                        };
                    };
                },
                error: function (err) {
                    //alert('error');
                }
            });


        },
        error: function (err) {
            //alert('error');
        }
    });
};

function showLayer(pos) {
    for (var i = 0; i < capa.graphics.length; i++) {
        var _color;
        if (capa.graphics[i].attributes["NOMBRE_CIE"] == tipos[pos]) {
            _color = new dojo.Color({ r: 255, g: 0, b: 0, a: 0.45 });
        } else {
            _color = new dojo.Color(color_capa);
        };        
        switch (capa.graphics[i].geometry.type) {
            case "point":
                capa.graphics[i].symbol = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 13,
                                                                               new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color(_color), 2),
                                                                               new dojo.Color(_color));
                break;
            case "multipoint":
                capa.graphics[i].symbol = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 13,
                                                                               new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color(_color), 2),
                                                                               new dojo.Color(_color));
                break;
            case "polyline":
                capa.graphics[i].symbol = new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color(_color), 2);
                break;
            case "polygon":
                capa.graphics[i].symbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID,
                                                                              new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color(_color), 2),
                                                                               new dojo.Color(_color));
                break;
            case "extent":
                capa.graphics[i].symbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID,
                                                                              new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color(_color), 2),
                                                                               new dojo.Color(_color));
                break;
        }

    };
    capa.refresh();
}

function showDetails(pos) {
    $.ajax({
        url: _freebase_ur_topic + "&topic=" + cache_data[pos],
        type: 'POST',
        dataType: 'json',
        success: function (response) {
            $('#info_nombre').html(response.property["/type/object/name"].values[0].value);
            $('#info_descripcion').html(response.property["/common/topic/description"].values[0].value);
            var photoHTML = "";
            var photoCount = 0;
            try {
                photoCount = response.property["/common/topic/image"].count;
                for (var j = 0; j < response.property["/common/topic/image"].count; j++) {
                    photoHTML = photoHTML + "<img src='https://usercontent.googleapis.com/freebase/v1/image" + response.property["/common/topic/image"].values[j].id + "' /><br />";
                };
            } catch (ex) {

            }
            $('#info_fotos_count').html(photoCount);            
            $('#info_fotos').html(photoHTML);
            $('#info').popup('open');
        },
        error: function (err) {
            //alert('error');
        }
    });
   
}

function getCircle(center, radius) {
    var points = getPoints(center, radius);
    var polygon = esri.geometry.Polygon(map.spatialReference);
    polygon.addRing(points);
    return polygon;
}

function getPoints(center, radius) {
    var points = [];
    var sin;
    var cos;
    var x;
    var y;
    for (var i = 0; i < 50; i++) {
        sin = Math.sin(Math.PI * 2 * i / 50);
        cos = Math.cos(Math.PI * 2 * i / 50);
        x = center.x + radius * sin;
        y = center.y + radius * cos;
        points.push(new esri.geometry.Point(x, y));
    }
    return points;
}


function isTouchDevice() {
    try {
        document.createEvent("TouchEvent");
        return true;
    } catch (e) {
        return false;
    }
}

function capture(sourceType) {
    navigator.camera.getPicture(captureSuccess, captureFail, {
        destinationType: Camera.DestinationType.FILE_URI,
        quality: 100,
        targetWidth: 400,
        targetHeight: 400,
        sourceType: sourceType,
        encodingType: Camera.EncodingType.JPEG
    });
};

function captureSuccess(imageURI) {
    $('#reportar').popup('close');
    $('#msgTXT2').html('Cargando foto, por favor, espere.');
    $('#msg2').popup('open');

    var fail, ft, options, params, win;
    options = new FileUploadOptions();
    options.fileKey = "nva_imagen";
    options.fileName = "imagen_" + new Date().getTime() + ".jpg";
    ft = new FileTransfer();
    ft.upload(imageURI, _url_photo, uploadSuccessFT, uploadFail, options);
};

function cargarFoto() {
    $('#reportar').popup('close');
    $('#msgTXT2').html('Cargando foto... Por favor, espere.');
    $('#msg2').popup('open');

    var formData = new FormData($('#photoweb')[0]);

    $.ajax({
        url: _url_photo,
        type: 'POST',
        data: formData,
        async: false,
        success: uploadSuccess,
        error: uploadFail,
        contentType: false,
        cache: false,
        processData: false
    });
};

function captureFail(message) {
    $('#msgTXT2').html('No se pudo capturar la foto, por favor, intente m&aacute;s tarde.');
    $('#msg2').popup('open');
};

function uploadSuccess(objResponse) {
    $('#reportar').popup('close');
    if (objResponse.message == null) {
        $('#msgTXT2').html('Foto cargada exitosamente.');
        photoURLS.push(objResponse.url);
        $('#ffield').html('Foto: ' + photoURLS.length);
    } else {
        $('#msgTXT2').html('No se pudo cargar la foto. Raz&oacute;n: ' + objResponse.message);
    }
    $('#msg2').popup('open');
};

function uploadSuccessFT(response) {
    var objResponse;
    objResponse = JSON.parse(response.response);
    $('#reportar').popup('close');
    if (objResponse.message == null) {
        $('#msgTXT2').html('Foto cargada exitosamente.');
        photoURLS.push(objResponse.url);
        $('#ffield').html('Foto: ' + photoURLS.length);
    } else {
        $('#msgTXT2').html('No se pudo cargar la foto. Raz&oacute;n: ' + objResponse.message);
    }
    $('#msg2').popup('open');
};

function uploadFail(error) {
    $('#reportar').popup('close');
    $('#msgTXT2').html('No se pudo cargar la foto, por favor, intente m&aacute;s tarde.');
    $('#msg2').popup('open');
};

function enviar_msg() {
    /*
    $.validity.start();
    $("#fcorreo").require();
    $("#fnombre").require();
    $("#ftelefono").require();
    $("#fdescripcion").require();
    if ($.validity.end().errors > 0) {
        $('#reportar').popup('close');
        $('#msgTXT2').html('Debe completar todos los campos para enviar un reporte.');
        $('#msg2').popup('open');
        return;
    };

    $.validity.start();
    $("#fcorreo").match("email");
    if ($.validity.end().errors > 0) {
        $('#reportar').popup('close');
        $('#msgTXT2').html('Debe ingresar un correo electr&oacute;nico v&aacute;lido.');
        $('#msg2').popup('open');
        return;
    };
    */
    var photoMSG = '';
    if (photoURLS.length > 0) {
        for (var i = 0; i < photoURLS.length; i++) {
            photoMSG = photoMSG + '&Foto=' + photoURLS[i];
        }
    };

    var msgURL;
    msgURL = _url_msg + '&categoria=' + $('#fopcion')[0].value + '&Descripcion=' + encodeURIComponent($('#fdescripcion')[0].value)
                  + '&Latitud=' + currentPoint.y + '&Longitud=' + currentPoint.x + photoMSG
                  + '&Telefono=' + encodeURIComponent($('#ftelefono')[0].value) + '&Nombre=' + encodeURIComponent($('#fnombre')[0].value)
                  + '&Correo=' + encodeURIComponent($('#fcorreo')[0].value);

    $('#reportar').popup('close');
    $('#msgTXT').html('Enviando reporte... Por favor, espere.');
    $('#msg').popup('open');

    $.ajax({
        url: msgURL,
        type: 'GET',
        success: function () {
            $('#msgTXT').html('Reporte enviado exitosamente.');
            $('#msg').popup('open');
        },
        error: function () {
            $('#msgTXT2').html('No se pudo enviar el reporte, por favor, intente m&aacute;s tarde.');
            $('#msg2').popup('open');
        }
    });
};

function isPhoneGapExclusive() {
    try {
        return (cordova || PhoneGap || phonegap);
    } catch (err) {
        return false;
    }
}

function isPhoneGap() {
    try {
        return (cordova || PhoneGap || phonegap)
        && /^file:\/{3}[^\/]/i.test(window.location.href)
        && /ios|iphone|ipod|ipad|android/i.test(navigator.userAgent);
    } catch (err) {
        return false;
    }
}

function count(array, value) {
    var counter = 0;
    for (var i = 0; i < array.length; i++) {
        if (array[i] === value) counter++;
    }
    return counter;
}