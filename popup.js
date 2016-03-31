$(document).ready(function(){
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var active_tabId = tabs[0].id;
    var html_count = 0;
    var css_count = 0;
    var js_count = 0;
    var image_count = 0;
    var font_count = 0;
    var xhr_count = 0;
    var other_count = 0;
    var found_apps = {};
    var found_domains = [];
    
    //getting Alexa ranking
    tab_domain = getDomain(tabs[0].url);
    $.get("http://data.alexa.com/data?cli=10&url="+tab_domain, function(data){
      global_rank = $(data).find('POPULARITY').attr('TEXT');
      rank_location = $(data).find('COUNTRY').attr('NAME');
      local_rank = $(data).find('COUNTRY').attr('RANK');

      $("#global_rank").text(' '+global_rank);
      $("#rank_location").append(' '+rank_location);
      $("#local_rank").text(' '+local_rank);

    });

    //sending request to BG to get assets
    chrome.runtime.sendMessage({sentTabId: active_tabId}, function(response) {});

    //listening to BG
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){

      //filter for requests only for active tab
      if (request.fromBG[0].tabId == active_tabId){

        domain_ = getDomain(request.fromBG[0].url);

        //prevent searching of duplicate domains
        if (found_domains.indexOf(domain_)==-1){
          found_domains.push(domain_);
          temp = findApp(domain_);
          app_name = temp[0];
          app_type = temp[1];
          app_pic = temp[2];

          //populating found apps from domains
          if (temp != "No App"){
            if (found_apps[app_name]==null){
              found_apps[app_name]=[app_type,[domain_],app_pic];
              $('.'+found_apps[app_name][0]).append($('<div class="app_name" id="'+app_name+'"><p>'+app_name+'<img align="right" style="margin-top: -15px" src="'+found_apps[app_name][2]+'"></img></p></div>'));
                $('#'+app_name).append($('<div class="app_src">'+domain_+'</div>'));  
            }else{
              found_apps[app_name][1].push(domain_);
              if ($('#'+app_name).closest('div').find('.app_src').is(":visible")){  //accounting for toggling
                $('#'+app_name).append($('<div class="app_src" style="display:block;">'+domain_+'</div>'));
              }else{
                $('#'+app_name).append($('<div class="app_src">'+domain_+'</div>'));
              }
            }
          }

          //populating found apps from cname of domains
          (function(domain) {
            $.get("http://localhost:3000/nslookups?host="+domain, function(cname){

              console.log("From ruby server: "+cname);   //cname returned by Ruby server
              console.log("In callback Domain is: " + domain);

              if (cname.trim() != "No CNAME"){
                temp1 = findApp(cname);
                app_name = temp1[0];
                app_type = temp1[1];
                app_pic = temp1[2];

                if (temp1 != "No App"){
                  if (found_apps[app_name]==null){
                    found_apps[app_name]=[app_type,[domain],app_pic];
                    $('.'+found_apps[app_name][0]).append($('<div class="app_name" id="'+app_name+'"><p>'+app_name+'<img align="right" style="margin-top: -15px" src="'+found_apps[app_name][2]+'"></img></p></div>'));
                      $('#'+app_name).append($('<div class="app_src">'+domain+'</div>'));
                  }else{
                    if($.inArray(domain, found_apps[app_name][1])==-1){
                      found_apps[app_name][1].push(domain);
                      if ($('#'+app_name).closest('div').find('.app_src').is(":visible")){  //accounting for toggling
                        $('#'+app_name).append($('<div class="app_src" style="display:block;">'+domain+'</div>'));
                      }else{
                        $('#'+app_name).append($('<div class="app_src">'+domain+'</div>'));
                      }
                    }
                  }
                }
              }
            });
          })(domain_);
        }

        //request navigation timing from tab
        chrome.tabs.sendMessage(active_tabId, {message: "get performance"}, function(response){
          perf_metrics = response.fromTab;
          ttfb = perf_metrics.responseStart - perf_metrics.navigationStart;
          domLoaded = perf_metrics.domContentLoadedEventEnd - perf_metrics.navigationStart;
          pageLoad = perf_metrics.loadEventEnd - perf_metrics.navigationStart;
          fullyLoaded = request.fromBG[1] - perf_metrics.navigationStart;

          $("#ttfb").text(' '+ttfb+' ms');
          $("#domLoaded").text(' '+domLoaded+' ms');
          $("#pageLoad").text(' '+pageLoad+' ms');
          $("#fullyLoaded").text(' '+Math.round(fullyLoaded)+' ms');
        });

        //pie chart and legend updates
        var $doughnutChart = $('#doughnutChart');
        switch(request.fromBG[0].type) {
          case "script":
            js_count++;
            redrawChart($doughnutChart);
            if (js_count==1){
              $(".asset_legend").append($('<div class="square" style="background:#2C3E50"></div><div>&nbsp;&nbsp;Javascript: <span id="javascript">1</span></div>'));
            }else{
              $("#javascript").text(js_count);
            }
            break;
          case "image":
            image_count++;
            redrawChart($doughnutChart);
            if (image_count==1){
              $(".asset_legend").append($('<div class="square" style="background:#FC4349"></div><div>&nbsp;&nbsp;Image: <span id="image">1</span></div>'));
            }else{
              $("#image").text(image_count);
            }
            break;
          case "stylesheet":
            css_count++;
            redrawChart($doughnutChart);
            if (css_count==1){
              $(".asset_legend").append($('<div class="square" style="background:#6DBCDB"></div><div>&nbsp;&nbsp;CSS: <span id="css">1</span></div>'));
            }else{
              $("#css").text(css_count);
            }
            break;
          case "font":
            font_count++;
            redrawChart($doughnutChart);
            if (font_count==1){
              $(".asset_legend").append($('<div class="square" style="background:#F7E248"></div><div>&nbsp;&nbsp;Font: <span id="font">1</span></div>'));
            }else{
              $("#font").text(font_count);
            }
            break;
          case "xmlhttprequest":
            xhr_count++;
            redrawChart($doughnutChart);
            if (xhr_count==1){
              $(".asset_legend").append($('<div class="square" style="background:#009933"></div><div>&nbsp;&nbsp;XHR: <span id="xhr">1</span></div>'));
            }else{
              $("#xhr").text(xhr_count);
            }
            break;
          case "main_frame":
            html_count++;
            redrawChart($doughnutChart);
            if (html_count==1){
              $(".asset_legend").append($('<div class="square" style="background:#D7DADB"></div><div>&nbsp;&nbsp;HTML: <span id="html">1</span></div>'));
            }else{
              $("#html").text(html_count);
            }
            break;
          case "sub_frame":
            html_count++;
            redrawChart($doughnutChart);
            if (html_count==1){
              $(".asset_legend").append($('<div class="square" style="background:#D7DADB"></div><div>&nbsp;&nbsp;HTML: <span id="html">1</span></div>'));
            }else{
              $("#html").text(html_count);
            }
            break;
          default:
            other_count++;
            redrawChart($doughnutChart);
            if (other_count==1){
              $(".asset_legend").append($('<div class="square" style="background:#FFF"></div><div>&nbsp;&nbsp;Other: <span id="other">1</span></div>'));
            }else{
              $("#other").text(other_count);
            }
        }
      }

      //reset counts to 0 on URL update
      if (request.fromBG == "reset"){
        html_count = 0;
        css_count = 0;
        js_count = 0;
        image_count = 0;
        font_count = 0;
        xhr_count = 0;
        other_count = 0;
        found_apps = {};
        found_domains = [];
        $(".asset_legend").replaceWith($('<div class="asset_legend">'));
      }

      function redrawChart($doughnutChart){
        $doughnutChart.html('');
        $doughnutChart.drawDoughnutChart([
          { title: "Javascript", value : js_count,  color: "#2C3E50" },
          { title: "Image", value : image_count,   color: "#FC4349" },
          { title: "CSS", value : css_count,   color: "#6DBCDB" },
          { title: "Font", value : font_count,   color: "#F7E248" },
          { title: "XHR", value : xhr_count,   color: "#009933" },
          { title: "HTML", value : html_count,   color: "#D7DADB" },
          { title: "Other", value : other_count,   color: "#FFF" }
        ]);
      };
    });
  });

  //domain toggling
  $('.category').on('click', '.app_name', (function(){
    $(this).closest('div').find('.app_src').slideToggle("fast");
  }));
});


var findApp = function(domain){
//looking at domains coming in
// $('#discover').append($('<p>'+domain+'</p>'));
  var lookup_table={
    'edgekey':['Akamai','cdn','Akamai-logo.png'],
    'edgesuite':['Akamai','cdn','Akamai-logo.png'],
    'akamai':['Akamai','cdn','Akamai-logo.png'],
    'akadns':['Akamai','cdn','Akamai-logo.png'],
    'edgecast':['EdgeCast','cdn','EdgeCast-logo.png'],
    'cloudfront':['Cloudfront','cdn','CloudFront-logo.png'],
    'facebook':['Facebook', '3rdParty','Facebook-logo.png'],
    'google-analytics':['GoogleAnalytics', 'analytics','Google_Analytics-logo.png'],
    'omtrdc':['Omniture', 'analytics','Omniture-logo.png'],
    'twitter':['Twitter', '3rdParty','Twitter-logo.png'],
    'doubleclick':['DoubleClick', '3rdParty','DoubleClick-logo.png'],
    'monetate':['Monetate', 'analytics','Monetate-logo.png'],
    'googletagmanager':['GoogleTagManager', 'tagManager','Google_Tag_Manager-logo.png'],
    'tiqcdn':['Tealium', 'tagManager','Tealium-logo.png'],
    'thebrighttag':['BrightTag', 'tagManager','BrightTag-logo.png'],
    'adobedtm':['AdobeTagManager', 'tagManager','Adobe-logo.png'],
    'addthis':['AddThis', '3rdParty','AddThis-logo.png'],
    'fastly.net':['Fastly','cdn','Fastly-logo.png'],
    'llnwd':['LimeLight','cdn','Limelight-logo.png'],
    'cloudflare':['CloudFlare','cdn','CloudFlare-logo.png'],
    'coremetrics':['CoreMetrics','analytics','CoreMetrics-logo.png'],
    'bluekai':['BlueKai','platform','BlueKai-logo.png'],
    'amazonaws':['AmazonAWS','platform','AWS-logo.png'],
    'optimizely':['Optimizely','analytics','Optimizely-logo.png'],
    'yottaa':['Yottaa','cdn','Yottaa-logo.png']
  };

  for (key in lookup_table){
    if ((domain.toLowerCase()).includes(key)){
      return lookup_table[key];
    }
  }
  return "No App";
};

var getDomain = function(href){
  var parser = document.createElement("a");
  parser.href = href;

  return parser.hostname;
};
