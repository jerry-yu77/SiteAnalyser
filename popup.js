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
    var tabDomain = getDomain(tabs[0].url);
    $.get("http://data.alexa.com/data?cli=10&url="+tabDomain, handlealexaRanking);

    //sending request to BG to get assets
    chrome.runtime.sendMessage({sentTabId: activeTabId}, handleSendToBG);

    //listening to BG
    chrome.runtime.onMessage.addListener(handleMessageFromBG);

    function handlealexaRanking(data){
      var globalRank = $(data).find('POPULARITY').attr('TEXT');
      var rankLocation = $(data).find('COUNTRY').attr('NAME');
      var localRank = $(data).find('COUNTRY').attr('RANK');

      $('#global-rank').text(' '+globalRank);
      $('#rank-location').append(' '+rankLocation);
      $('#local-rank').text(' '+localRank);
    };

    function handleSendToBG(response){};

    function handleMessageFromBG(request, sender, sendResponse){
      //filter for requests only for active tab
      if (request.fromBG[0].tabId === activeTabId){

        var domain_ = getDomain(request.fromBG[0].url);

        //prevent searching of duplicate domains
        if (foundDomains.indexOf(domain_)===-1){
          foundDomains.push(domain_);
          var temp = findApp(domain_);
          var appName = temp[0];
          var appType = temp[1];
          var appPic = temp[2];

          //populating found apps from domains
          if (temp != "No App"){
            if (foundApps[appName]===undefined){
              foundApps[appName]=[appType,[domain_],appPic];
              var $appName = $('<div>',{
                class: 'app-name',
                id: appName
              });
              var $appText = $('<p>',{
                text: appName
              });
              var $appPic = $('<img>',{
                align: 'right',
                class: 'app-pic',
                src: appPic
              });
              var $appSrc = $('<div>',{
                class: 'app-src',
                text: domain_
              });
              $('.'+appType)
                .append($appName
                  .append($appText
                    .append($appPic))
                  .append($appSrc));
            }else{
              foundApps[appName][1].push(domain_);
              if ($('#'+appName).closest('div').find('.app-src').is(":visible")){  //accounting for toggling
                $('<div/>',{
                  class: 'app-src',
                  style: 'display:block',
                  text: domain_
                }).appendTo('#'+appName);
              }else{
                $('<div/>',{
                  class: 'app-src',
                  text: domain_
                }).appendTo('#'+appName);
              }
            }
          }

          //populating found apps from cname of domains
          (function(domain) {
            $.get("https://apps-dev-new.yottaa.com/assessment/nslookups?host="+domain, function(cname){

              console.log("From ruby server: "+cname);   //cname returned by Ruby server
              console.log("In callback Domain is: " + domain);

              if (cname.trim() != "No CNAME"){
                var temp1 = findApp(cname);
                var appName = temp1[0];
                var appType = temp1[1];
                var appPic = temp1[2];

                if (temp1 != "No App"){
                  if (foundApps[appName]===undefined){
                    foundApps[appName]=[appType,[domain],appPic];
                    var $appName = $('<div>',{
                      class: 'app-name',
                      id: appName
                    });
                    var $appText = $('<p>',{
                      text: appName
                    });
                    var $appPic = $('<img>',{
                      align: 'right',
                      class: 'app-pic',
                      src: appPic
                    });
                    var $appSrc = $('<div>',{
                      class: 'app-src',
                      text: domain
                    });
                    $('.'+appType)
                      .append($appName
                        .append($appText
                          .append($appPic))
                        .append($appSrc));
                  }else{
                    if($.inArray(domain, foundApps[appName][1])===-1){
                      foundApps[appName][1].push(domain);
                      if ($('#'+appName).closest('div').find('.app-src').is(":visible")){  //accounting for toggling
                        $('<div/>',{
                          class: 'app-src',
                          style: 'display:block',
                          text: domain
                        }).appendTo('#'+appName);
                      }else{
                        $('<div/>',{
                          class: 'app-src',
                          text: domain
                        }).appendTo('#'+appName);
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
          var perfMetrics = response.fromTab;
          var ttfb = perfMetrics.responseStart - perfMetrics.navigationStart;
          var domLoaded = perfMetrics.domContentLoadedEventEnd - perfMetrics.navigationStart;
          var pageLoad = perfMetrics.loadEventEnd - perfMetrics.navigationStart;
          var fullyLoaded = request.fromBG[1] - perfMetrics.navigationStart;

          $('#ttfb').text(' '+ttfb+' ms');
          $('#dom-loaded').text(' '+domLoaded+' ms');
          $('#page-load').text(' '+pageLoad+' ms');
          $('#fully-loaded').text(' '+Math.round(fullyLoaded)+' ms');
        });

        //pie chart and legend updates
        var $doughnutChart = $('#doughnut-chart');
        var $assetLegend = $('.asset-legend');
        switch(request.fromBG[0].type) {
          case "script":
            jsCount++;
            redrawChart();
            if (jsCount===1){
              var $square = $('<div>',{
                class: 'square',
                style: 'background:#2C3E50'
              });
              var $squareText = $('<div>',{
                html: '&nbsp;&nbsp;Javascript: '
              });
              var $squareCount = $('<span>',{
                id: 'javascript',
                text: '1'
              });
              $assetLegend
                .append($square)
                .append($squareText
                  .append($squareCount));
            }else{
              $("#javascript").text(jsCount);
            }
            break;
          case "image":
            imageCount++;
            redrawChart();
            if (imageCount===1){
              var $square = $('<div>',{
                class: 'square',
                style: 'background:#FC4349'
              });
              var $squareText = $('<div>',{
                html: '&nbsp;&nbsp;Image: '
              });
              var $squareCount = $('<span>',{
                id: 'image',
                text: '1'
              });
              $assetLegend
                .append($square)
                .append($squareText
                  .append($squareCount));
            }else{
              $('#image').text(imageCount);
            }
            break;
          case "stylesheet":
            cssCount++;
            redrawChart();
            if (cssCount===1){
              var $square = $('<div>',{
                class: 'square',
                style: 'background:#6DBCDB'
              });
              var $squareText = $('<div>',{
                html: '&nbsp;&nbsp;CSS: '
              });
              var $squareCount = $('<span>',{
                id: 'css',
                text: '1'
              });
              $assetLegend
                .append($square)
                .append($squareText
                  .append($squareCount));
            }else{
              $('#css').text(cssCount);
            }
            break;
          case "font":
            fontCount++;
            redrawChart();
            if (fontCount===1){
              var $square = $('<div>',{
                class: 'square',
                style: 'background:#F7E248'
              });
              var $squareText = $('<div>',{
                html: '&nbsp;&nbsp;Font: '
              });
              var $squareCount = $('<span>',{
                id: 'font',
                text: '1'
              });
              $assetLegend
                .append($square)
                .append($squareText
                  .append($squareCount));
            }else{
              $('#font').text(fontCount);
            }
            break;
          case "xmlhttprequest":
            xhrCount++;
            redrawChart();
            if (xhrCount===1){
              var $square = $('<div>',{
                class: 'square',
                style: 'background:#009933'
              });
              var $squareText = $('<div>',{
                html: '&nbsp;&nbsp;XHR: '
              });
              var $squareCount = $('<span>',{
                id: 'xhr',
                text: '1'
              });
              $assetLegend
                .append($square)
                .append($squareText
                  .append($squareCount));
            }else{
              $('#xhr').text(xhrCount);
            }
            break;
          case "main_frame":
            htmlCount++;
            redrawChart();
            if (htmlCount===1){
              var $square = $('<div>',{
                class: 'square',
                style: 'background:#D7DADB'
              });
              var $squareText = $('<div>',{
                html: '&nbsp;&nbsp;HTML: '
              });
              var $squareCount = $('<span>',{
                id: 'html',
                text: '1'
              });
              $assetLegend
                .append($square)
                .append($squareText
                  .append($squareCount));
            }else{
              $('#html').text(htmlCount);
            }
            break;
          case "sub_frame":
            htmlCount++;
            redrawChart();
            if (htmlCount===1){
              var $square = $('<div>',{
                class: 'square',
                style: 'background:#D7DADB'
              });
              var $squareText = $('<div>',{
                html: '&nbsp;&nbsp;HTML: '
              });
              var $squareCount = $('<span>',{
                id: 'html',
                text: '1'
              });
              $assetLegend
                .append($square)
                .append($squareText
                  .append($squareCount));
            }else{
              $('#html').text(htmlCount);
            }
            break;
          default:
            otherCount++;
            redrawChart();
            if (otherCount===1){
              var $square = $('<div>',{
                class: 'square',
                style: 'background:#FFF'
              });
              var $squareText = $('<div>',{
                html: '&nbsp;&nbsp;Other: '
              });
              var $squareCount = $('<span>',{
                id: 'other',
                text: '1'
              });
              $assetLegend
                .append($square)
                .append($squareText
                  .append($squareCount));
            }else{
              $('#other').text(otherCount);
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
      if (request.fromBG === "reset"){
        htmlCount = 0;
        cssCount = 0;
        jsCount = 0;
        imageCount = 0;
        fontCount = 0;
        xhrCount = 0;
        otherCount = 0;
        foundApps = {};
        foundDomains = [];
        $('.asset-legend').html('');
      }
    };
  });

  //domain toggling
  $('.category').on('click', '.app-name', (function(){
    $(this).closest('div').find('.app-src').slideToggle("fast");
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
    'facebook':['Facebook', '3rd-party','logos/Facebook-logo.png'],
    'google-analytics':['GoogleAnalytics', 'analytics','logos/Google_Analytics-logo.png'],
    'omtrdc':['Omniture', 'analytics','logos/Omniture-logo.png'],
    'twitter':['Twitter', '3rd-party','logos/Twitter-logo.png'],
    'doubleclick':['DoubleClick', '3rd-party','logos/DoubleClick-logo.png'],
    'monetate':['Monetate', 'analytics','logos/Monetate-logo.png'],
    'googletag-manager':['Googletag-Manager', 'tag-manager','logos/Google_Tag_Manager-logo.png'],
    'tiqcdn':['Tealium', 'tag-manager','logos/Tealium-logo.png'],
    'thebrighttag':['BrightTag', 'tag-manager','logos/BrightTag-logo.png'],
    'adobedtm':['Adobetag-Manager', 'tag-manager','logos/Adobe-logo.png'],
    'addthis':['AddThis', '3rd-party','logos/AddThis-logo.png'],
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