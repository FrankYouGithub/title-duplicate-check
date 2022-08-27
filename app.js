/*
 * @Author       : frank
 * @Date         : 2022-08-27 10:11:39
 * @LastEditTime : 2022-08-27 11:58:31
 * @LastEditors  : frank
 * @Description  : In User Settings Edit
 */
var https = require("https");        //网络请求

var fs = require("fs");            //操作文件，读写文件

var cheerio = require("cheerio");  //扩展模块

const text = '狄仁杰之浴火麒麟:【预告】大唐奇案疑云诡异,来和狄公一起破案';
const wz = `https://cn.bing.com/search?q=${text}&PC=U316&FORM=CHROMN`; //网址

var strHtml = "";
var results = [];
https.get(wz, function (res) {
  res.on("data", function (chunk) {
    strHtml += chunk;
  })
  res.on("end", function () {

    // console.log(strHtml);

    var $ = cheerio.load(strHtml);

    $("#b_results li .b_title").each((iten, i) => {
      const str = $(i).text().split(' ...')[0];
      console.log(str, `      ========>相似度：${similar(text, str)}`);
      // console.log('----------------------------------------------------------------------------')
      // results.push($(i).text())
      // console.log(results.toString())
    })
  });
})

/**
 * 相似度对比
 * @param s 文本1
 * @param t 文本2
 * @param f 小数位精确度，默认2位
 * @returns {string|number|*} 百分数前的数值，最大100. 比如 ：90.32
 */
function similar(s, t, f) {
  if (!s || !t) {
    return 0
  }
  if (s === t) {
    return 100;
  }
  var l = s.length > t.length ? s.length : t.length
  var n = s.length
  var m = t.length
  var d = []
  f = f || 2
  var min = function (a, b, c) {
    return a < b ? (a < c ? a : c) : (b < c ? b : c)
  }
  var i, j, si, tj, cost
  if (n === 0) return m
  if (m === 0) return n
  for (i = 0; i <= n; i++) {
    d[i] = []
    d[i][0] = i
  }
  for (j = 0; j <= m; j++) {
    d[0][j] = j
  }
  for (i = 1; i <= n; i++) {
    si = s.charAt(i - 1)
    for (j = 1; j <= m; j++) {
      tj = t.charAt(j - 1)
      if (si === tj) {
        cost = 0
      } else {
        cost = 1
      }
      d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
    }
  }
  let res = (1 - d[n][m] / l) * 100
  return res.toFixed(f)
}