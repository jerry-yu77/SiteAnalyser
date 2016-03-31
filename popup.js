$(document).ready(function(){
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var activeTabId = tabs[0].id;
    var htmlCount = 0;
    var cssCount = 0;
    var jsCount = 0;
    var imageCount = 0;
    var fontCount = 0;
    var xhrCount = 0;
    var otherCount = 0;
    var foundApps = {};
    var foundDomains = [];
    
    //getting Alexa ranking
    tabDomain = getDomain(tabs[0].url);
    $.get("http://data.alexa.com/data?cli=10&url="+tabDomain, handleAlexaRanking);

    //sending request to BG to get assets
    chrome.runtime.sendMessage({sentTabId: activeTabId}, handleSendToBG);

    //listening to BG
    chrome.runtime.onMessage.addListener(handleMessageFromBG);

    function handleAlexaRanking(data){
      globalRank = $(data).find('POPULARITY').attr('TEXT');
      rankLocation = $(data).find('COUNTRY').attr('NAME');
      localRank = $(data).find('COUNTRY').attr('RANK');

      $('#globalRank').text(' '+globalRank);
      $('#rankLocation').append(' '+rankLocation);
      $('#localRank').text(' '+localRank);

    };

    function handleSendToBG(response){};

    function handleMessageFromBG(request, sender, sendResponse){
      //filter for requests only for active tab
      if (request.fromBG[0].tabId == activeTabId){

        domain_ = getDomain(request.fromBG[0].url);

        //prevent searching of duplicate domains
        if (foundDomains.indexOf(domain_)==-1){
          foundDomains.push(domain_);
          temp = findApp(domain_);
          appName = temp[0];
          appType = temp[1];
          appPic = temp[2];

          //populating found apps from domains
          if (temp != "No App"){
            if (foundApps[appName]==null){
              foundApps[appName]=[appType,[domain_],appPic];
              $('.'+appType).append($('<div class="appName" id="'+appName+'"><p>'+appName+'<img align="right" class="appPic" src="'+appPic+'"></img></p></div>'));
                $('#'+appName).append($('<div class="appSrc">'+domain_+'</div>'));  
            }else{
              foundApps[appName][1].push(domain_);
              if ($('#'+appName).closest('div').find('.appSrc').is(":visible")){  //accounting for toggling
                $('#'+appName).append($('<div class="appSrc" style="display:block;">'+domain_+'</div>'));
              }else{
                $('#'+appName).append($('<div class="appSrc">'+domain_+'</div>'));
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
                appName = temp1[0];
                appType = temp1[1];
                appPic = temp1[2];

                if (temp1 != "No App"){
                  if (foundApps[appName]==null){
                    foundApps[appName]=[appType,[domain],appPic];
                    $('.'+appType).append($('<div class="appName" id="'+appName+'"><p>'+appName+'<img align="right" class="appPic" src="'+appPic+'"></img></p></div>'));
                      $('#'+appName).append($('<div class="appSrc">'+domain+'</div>'));
                  }else{
                    if($.inArray(domain, foundApps[appName][1])==-1){
                      foundApps[appName][1].push(domain);
                      if ($('#'+appName).closest('div').find('.appSrc').is(":visible")){  //accounting for toggling
                        $('#'+appName).append($('<div class="appSrc" style="display:block;">'+domain+'</div>'));
                      }else{
                        $('#'+appName).append($('<div class="appSrc">'+domain+'</div>'));
                      }
                    }
                  }
                }
              }
            });
          })(domain_);
        }

        //request navigation timing from tab
        chrome.tabs.sendMessage(activeTabId, {message: "get performance"}, function(response){
          perfMetrics = response.fromTab;
          ttfb = perfMetrics.responseStart - perfMetrics.navigationStart;
          domLoaded = perfMetrics.domContentLoadedEventEnd - perfMetrics.navigationStart;
          pageLoad = perfMetrics.loadEventEnd - perfMetrics.navigationStart;
          fullyLoaded = request.fromBG[1] - perfMetrics.navigationStart;

          $("#ttfb").text(' '+ttfb+' ms');
          $("#domLoaded").text(' '+domLoaded+' ms');
          $("#pageLoad").text(' '+pageLoad+' ms');
          $("#fullyLoaded").text(' '+Math.round(fullyLoaded)+' ms');
        });

        //pie chart and legend updates
        var $doughnutChart = $('#doughnutChart');
        var $assetLegend = $('.assetLegend');
        switch(request.fromBG[0].type) {
          case "script":
            jsCount++;
            redrawChart();
            if (jsCount==1){
              $assetLegend.append($('<div class="square" style="background:#2C3E50"></div><div>&nbsp;&nbsp;Javascript: <span id="javascript">1</span></div>'));
            }else{
              $("#javascript").text(jsCount);
            }
            break;
          case "image":
            imageCount++;
            redrawChart();
            if (imageCount==1){
              $assetLegend.append($('<div class="square" style="background:#FC4349"></div><div>&nbsp;&nbsp;Image: <span id="image">1</span></div>'));
            }else{
              $("#image").text(imageCount);
            }
            break;
          case "stylesheet":
            cssCount++;
            redrawChart();
            if (cssCount==1){
              $assetLegend.append($('<div class="square" style="background:#6DBCDB"></div><div>&nbsp;&nbsp;CSS: <span id="css">1</span></div>'));
            }else{
              $("#css").text(cssCount);
            }
            break;
          case "font":
            fontCount++;
            redrawChart();
            if (fontCount==1){
              $assetLegend.append($('<div class="square" style="background:#F7E248"></div><div>&nbsp;&nbsp;Font: <span id="font">1</span></div>'));
            }else{
              $("#font").text(fontCount);
            }
            break;
          case "xmlhttprequest":
            xhrCount++;
            redrawChart();
            if (xhrCount==1){
              $assetLegend.append($('<div class="square" style="background:#009933"></div><div>&nbsp;&nbsp;XHR: <span id="xhr">1</span></div>'));
            }else{
              $("#xhr").text(xhrCount);
            }
            break;
          case "main_frame":
            htmlCount++;
            redrawChart();
            if (htmlCount==1){
              $assetLegend.append($('<div class="square" style="background:#D7DADB"></div><div>&nbsp;&nbsp;HTML: <span id="html">1</span></div>'));
            }else{
              $("#html").text(htmlCount);
            }
            break;
          case "sub_frame":
            htmlCount++;
            redrawChart();
            if (htmlCount==1){
              $assetLegend.append($('<div class="square" style="background:#D7DADB"></div><div>&nbsp;&nbsp;HTML: <span id="html">1</span></div>'));
            }else{
              $("#html").text(htmlCount);
            }
            break;
          default:
            otherCount++;
            redrawChart();
            if (otherCount==1){
              $assetLegend.append($('<div class="square" style="background:#FFF"></div><div>&nbsp;&nbsp;Other: <span id="other">1</span></div>'));
            }else{
              $("#other").text(otherCount);
            }
        }
        function redrawChart(){
          $doughnutChart.html('');
          $doughnutChart.drawDoughnutChart([
            { title: "Javascript", value : jsCount,  color: "#2C3E50" },
            { title: "Image", value : imageCount,   color: "#FC4349" },
            { title: "CSS", value : cssCount,   color: "#6DBCDB" },
            { title: "Font", value : fontCount,   color: "#F7E248" },
            { title: "XHR", value : xhrCount,   color: "#009933" },
            { title: "HTML", value : htmlCount,   color: "#D7DADB" },
            { title: "Other", value : otherCount,   color: "#FFF" }
          ]);
        };
      }

      //reset counts to 0 on URL update
      if (request.fromBG == "reset"){
        htmlCount = 0;
        cssCount = 0;
        jsCount = 0;
        imageCount = 0;
        fontCount = 0;
        xhrCount = 0;
        otherCount = 0;
        foundApps = {};
        foundDomains = [];
        $(".assetLegend").html('');
      }
    };
  });

  //domain toggling
  $('.category').on('click', '.appName', (function(){
    $(this).closest('div').find('.appSrc').slideToggle("fast");
  }));
});

function findApp(domain){
//looking at domains coming in
// $('#discover').append($('<p>'+domain+'</p>'));
  var lookupTable={
    'edgekey':['Akamai','cdn','logos/Akamai-logo.png'],
    'edgesuite':['Akamai','cdn','logos/Akamai-logo.png'],
    'akamai':['Akamai','cdn','logos/Akamai-logo.png'],
    'akadns':['Akamai','cdn','logos/Akamai-logo.png'],
    'edgecast':['EdgeCast','cdn','logos/EdgeCast-logo.png'],
    'cloudfront':['Cloudfront','cdn','logos/CloudFront-logo.png'],
    'facebook':['Facebook', '3rdParty','logos/Facebook-logo.png'],
    'google-analytics':['GoogleAnalytics', 'analytics','logos/Google_Analytics-logo.png'],
    'omtrdc':['Omniture', 'analytics','logos/Omniture-logo.png'],
    'twitter':['Twitter', '3rdParty','logos/Twitter-logo.png'],
    'doubleclick':['DoubleClick', '3rdParty','logos/DoubleClick-logo.png'],
    'monetate':['Monetate', 'analytics','logos/Monetate-logo.png'],
    'googletagmanager':['GoogleTagManager', 'tagManager','logos/Google_Tag_Manager-logo.png'],
    'tiqcdn':['Tealium', 'tagManager','logos/Tealium-logo.png'],
    'thebrighttag':['BrightTag', 'tagManager','logos/BrightTag-logo.png'],
    'adobedtm':['AdobeTagManager', 'tagManager','logos/Adobe-logo.png'],
    'addthis':['AddThis', '3rdParty','logos/AddThis-logo.png'],
    'fastly.net':['Fastly','cdn','logos/Fastly-logo.png'],
    'llnwd':['LimeLight','cdn','logos/Limelight-logo.png'],
    'cloudflare':['CloudFlare','cdn','logos/CloudFlare-logo.png'],
    'coremetrics':['CoreMetrics','analytics','logos/CoreMetrics-logo.png'],
    'bluekai':['BlueKai','platform','logos/BlueKai-logo.png'],
    'amazonaws':['AmazonAWS','platform','logos/AWS-logo.png'],
    'optimizely':['Optimizely','analytics','logos/Optimizely-logo.png'],
    'yottaa':['Yottaa','cdn','logos/Yottaa-logo.png']
  };

  for (key in lookupTable){
    if ((domain.toLowerCase()).includes(key)){
      return lookupTable[key];
    }
  }
  return "No App";
};

function getDomain(href){
  var parser = document.createElement("a");
  parser.href = href;

  return parser.hostname;
};