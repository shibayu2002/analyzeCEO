const request = require("request");
const fs = require('fs');
const readline = require("readline");
const path = require('path');
const config = require('config');
const PersonalityInsightsV3 = require('watson-developer-cloud/personality-insights/v3');
const Promise = require('promise');

const loadCEOMessagePage = (target) => {
//  console.log("loadCEOMessagePage(" + target + ")");
  return new Promise((resolve, reject) => {
    request({
      'url': "https://www.googleapis.com/customsearch/v1"
             + "?key=" + config.apikey
             + "&cx=" + config.cxkey
             + "&q=" + encodeURIComponent("株式会社" + target + " 社長 メッセージ"),
      'method': 'GET',
      'encoding': 'UTF-8'
    }, (err, response, body) => {
      if (err) reject(err);

      var i = 0;
      JSON.parse(body).items.forEach((item) => {
        if (item.title.indexOf("挨拶") > 0 ||
            item.title.indexOf("メッセージ") > 0) {
          resolve(item.link);
        }
        if (i >= 10) reject("Not found CEO's message page.");
      });
    });
  });
}

const loadCEOMessage = (url) => {
//  console.log("loadCEOMessage(" + url + ")");
  return new Promise((resolve, reject) => {
    request({
      'url': url,
      'method': 'GET',
      'encoding': 'UTF-8'
    }, (err, response, body) => {
      if (err) reject(err);

      var html = body;
      if (typeof(html) != "string") reject("Undifind value");
      html = html.replace(/<.*?>/g, "");
      html = html.replace(/[a-zA-Z0-9_\(\),"\~\^\!\+\*\{\}\\\/:=\.\?\-;<>\|&\[\]\']*/g, "");
      html = html.replace(/\s/g, "");
      html = html.replace(/^\r\n/g, "");
      html = html.replace(/^.*?私/g, "私");
      html = html.replace(/年月株式.*/g, "");
      if (html.length >= 5000) reject("Message size is to learge.");
      else resolve(html);
    });
  });
}

const doWatson = (text) => {
//  console.log("doWatson(" + text + ")");
  return new Promise((resolve, reject) => {
    var buffer = new Buffer(text);
    var string = buffer.toString('base64');

    const personalityInsights = new PersonalityInsightsV3({
      'iam_apikey': config.wapikey,
      'version_date': config.wapiver,
      'url' : 'https://gateway-tok.watsonplatform.net/personality-insights/api'
    });

    personalityInsights.profile({
      'content': string,
      'content_type' : 'text/plain',
      'content_language' : 'ja',
      'accept_language' : 'ja',
      'raw_scores' : false,
      'consumption_preferences' : false
    }, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

const writeCSV = (code, name, url, json) => {
  var text = code;
  text = text + ", " + name;
  text = text + ", " + url;

  // big five
  text = text + ", " + findValue(json.personality, '知的好奇心');
  text = text + ", " + findValue(findChildren(json.personality, '知的好奇心'), '大胆性');
  text = text + ", " + findValue(findChildren(json.personality, '知的好奇心'), '芸術的関心度');
  text = text + ", " + findValue(findChildren(json.personality, '知的好奇心'), '情動性');
  text = text + ", " + findValue(findChildren(json.personality, '知的好奇心'), '想像力');
  text = text + ", " + findValue(findChildren(json.personality, '知的好奇心'), '思考力');
  text = text + ", " + findValue(findChildren(json.personality, '知的好奇心'), '現状打破');

  text = text + ", " + findValue(json.personality, '誠実性');
  text = text + ", " + findValue(findChildren(json.personality, '誠実性'), '達成努力');
  text = text + ", " + findValue(findChildren(json.personality, '誠実性'), '注意深さ');
  text = text + ", " + findValue(findChildren(json.personality, '誠実性'), '忠実さ');
  text = text + ", " + findValue(findChildren(json.personality, '誠実性'), '秩序性');
  text = text + ", " + findValue(findChildren(json.personality, '誠実性'), '自制力');
  text = text + ", " + findValue(findChildren(json.personality, '誠実性'), '自己効力感');
   
  text = text + ", " + findValue(json.personality, '外向性');
  text = text + ", " + findValue(findChildren(json.personality, '外向性'), '活発度');
  text = text + ", " + findValue(findChildren(json.personality, '外向性'), '自己主張');
  text = text + ", " + findValue(findChildren(json.personality, '外向性'), '明朗性');
  text = text + ", " + findValue(findChildren(json.personality, '外向性'), '刺激希求性');
  text = text + ", " + findValue(findChildren(json.personality, '外向性'), '友好性');
  text = text + ", " + findValue(findChildren(json.personality, '外向性'), '社交性');

  text = text + ", " + findValue(json.personality, '協調性');
  text = text + ", " + findValue(findChildren(json.personality, '協調性'), '利他主義');
  text = text + ", " + findValue(findChildren(json.personality, '協調性'), '協働性');
  text = text + ", " + findValue(findChildren(json.personality, '協調性'), '謙虚さ');
  text = text + ", " + findValue(findChildren(json.personality, '協調性'), '強硬さ');
  text = text + ", " + findValue(findChildren(json.personality, '協調性'), '共感度');
  text = text + ", " + findValue(findChildren(json.personality, '協調性'), '信用度');

  text = text + ", " + findValue(json.personality, '感情起伏');
  text = text + ", " + findValue(findChildren(json.personality, '感情起伏'), '激情的');
  text = text + ", " + findValue(findChildren(json.personality, '感情起伏'), '心配性');
  text = text + ", " + findValue(findChildren(json.personality, '感情起伏'), '悲観的');
  text = text + ", " + findValue(findChildren(json.personality, '感情起伏'), '利己的');
  text = text + ", " + findValue(findChildren(json.personality, '感情起伏'), '自意識過剰');
  text = text + ", " + findValue(findChildren(json.personality, '感情起伏'), '低ストレス耐性');

  // needs
  text = text + ", " + findValue(json.needs, '挑戦');
  text = text + ", " + findValue(json.needs, '親密');
  text = text + ", " + findValue(json.needs, '好奇心');
  text = text + ", " + findValue(json.needs, '興奮');
  text = text + ", " + findValue(json.needs, '調和');
  text = text + ", " + findValue(json.needs, '理想');
  text = text + ", " + findValue(json.needs, '自由主義');
  text = text + ", " + findValue(json.needs, '社会性');
  text = text + ", " + findValue(json.needs, '実用主義');
  text = text + ", " + findValue(json.needs, '自己表現');
  text = text + ", " + findValue(json.needs, '安定性');
  text = text + ", " + findValue(json.needs, '仕組');

  // values
  text = text + ", " + findValue(json.values, '現状維持');
  text = text + ", " + findValue(json.values, '変化許容性');
  text = text + ", " + findValue(json.values, '快楽主義');
  text = text + ", " + findValue(json.values, '自己増進');
  text = text + ", " + findValue(json.values, '自己超越');

  console.log(text);
}

const showHeader = () => {
  var text = "コード";
  text = text + ", " + "名称";
  text = text + ", " + "社長のメッセージURL";

  // big five
  text = text + ", " + "知的好奇心";
  text = text + ", " + "大胆性";
  text = text + ", " + "芸術的関心度";
  text = text + ", " + "情動性";
  text = text + ", " + "想像力";
  text = text + ", " + "思考力";
  text = text + ", " + "現状打破";

  text = text + ", " + "誠実性";
  text = text + ", " + "達成努力";
  text = text + ", " + "注意深さ";
  text = text + ", " + "忠実さ";
  text = text + ", " + "秩序性";
  text = text + ", " + "自制力";
  text = text + ", " + "自己効力感";

  text = text + ", " + "外向性";
  text = text + ", " + "活発度";
  text = text + ", " + "自己主張";
  text = text + ", " + "明朗性";
  text = text + ", " + "刺激希求性";
  text = text + ", " + "友好性";
  text = text + ", " + "社交性";

  text = text + ", " + "協調性";
  text = text + ", " + "利他主義";
  text = text + ", " + "協働性";
  text = text + ", " + "謙虚さ";
  text = text + ", " + "強硬さ";
  text = text + ", " + "共感度";
  text = text + ", " + "信用度";

  text = text + ", " + "感情起伏";
  text = text + ", " + "激情的";
  text = text + ", " + "心配性";
  text = text + ", " + "悲観的";
  text = text + ", " + "利己的";
  text = text + ", " + "自意識過剰";
  text = text + ", " + "低ストレス耐性";

  // needs
  text = text + ", " + "挑戦";
  text = text + ", " + "親密";
  text = text + ", " + "好奇心";
  text = text + ", " + "興奮";
  text = text + ", " + "調和";
  text = text + ", " + "理想";
  text = text + ", " + "自由主義";
  text = text + ", " + "社会性";
  text = text + ", " + "実用主義";
  text = text + ", " + "自己表現";
  text = text + ", " + "安定性";
  text = text + ", " + "仕組";

  // values
  text = text + ", " + "現状維持";
  text = text + ", " + "変化許容性";
  text = text + ", " + "快楽主義";
  text = text + ", " + "自己増進";
  text = text + ", " + "自己超越";

  console.log(text);
}

const findValue = (json, key) => {
  var value = 0.0;
  json.some((map) => {
    if(map.name == key) {
      value = map.percentile;
      return true;
    }
  });
  return value;
}

const findChildren = (json, key) => {
  var obj = null;
  json.some((map) => {
     if(map.name == key) {
       obj = map.children;
       return true;
    }
  });
  return obj;
}

const loadAll = () => {
  showHeader();
  var stream = fs.createReadStream(
          path.join(__dirname, config.corplist), "UTF-8");
  var reader = readline.createInterface({ input: stream });
  reader.on("line", (data) => {
//    console.log("load '" + data + "'");
    var cols = data.split(",");
    loadCEOMessagePage(cols[1]).then((pageUrl) => {
        loadCEOMessage(pageUrl).then((text) => {
        doWatson(text).then((res) => {
        writeCSV(cols[0], cols[1], pageUrl, res); }) }) });
  });
}

loadAll();
