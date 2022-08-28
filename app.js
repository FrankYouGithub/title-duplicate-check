#!/usr/bin/env node
const fs = require("fs");            //操作文件，读写文件
const path = require('path');
const https = require("https");        //网络请求
const cheerio = require("cheerio");  //扩展模块
const { fsExistsSync, getSuffix, copyWithStream, printHelp, readDir, outputHtml } = require('./util');

const pwd = process.cwd(); // 当前执行程序的路径 同 path.resolve('./')
const currentDir = pwd.substr(pwd.lastIndexOf('/') + 1);  // 当前执行程序所在的文件名
const pwd_ = path.resolve(pwd, '..'); // 当前执行程序的路径的上一级路径
const mode = process.argv[2]; // 命令 tit_check
const targetPath = process.argv[3] || path.join(pwd_, `${currentDir}_`); // 目标存放目录(用户数据 或 默认当前执行程序的路径的上一级路径+当前文件夹名+_)

if (mode !== 'start') {
  return
} else {
  printHelp()
}

let titleList = [];

const getTitle = (src) => {
  const files = readDir(src);  //读取源目录下的所有文件及文件夹
  files.forEach((file) => {
    const _src = path.join(src, file);
    if (fsExistsSync(_src)) {
      const stats = fs.statSync(_src);
      if (stats.isFile()) { //如果是个文件则拷贝
        const suffix = getSuffix(file);
        if (suffix === '.mp4') {
          titleList.push({
            title: path.basename(file, '.mp4'),
            path: _src
          })
        }
      } else if (stats.isDirectory()) { //是目录则 递归
        getTitle(_src);
      }
    } else {
      console.log(`处理 ${_src} 失败，请确认文件是否存在`);
    }
  });
}
getTitle(pwd)

if (titleList.length === 0) {
  return;
}
let count = 0;
const results = [];
// {
//     title: path.basename(file, '.mp4'),
//     path: _src
//     similarList: similarList
// }
const errorList = [];

const next = () => {
  if (count < titleList.length - 1) {
    count++
    checkTitle(count)
  } else {
    if (errorList.length) {
      console.log('错误列表：', errorList)
      titleList = errorList;
      count = 0;
      checkTitle(count)
    } else {
      outputHtml(results)
    }
  }
}
const checkTitle = (index) => {
  const item = titleList[index];
  const text = item.title;
  const wz = `https://cn.bing.com/search?q=${text}&PC=U316&FORM=CHROMN`; //网址
  let strHtml = "";
  console.log(`-------------- 正在比对第 ${index + 1} / ${titleList.length} 条：${text} 【比对结果】--------------`)
  https.get(wz, function (res) {
    res.on("data", function (chunk) {
      strHtml += chunk;
    })
    res.on("end", function () {
      const $ = cheerio.load(strHtml);
      const similarList = [];

      $("#b_results li.b_algo .b_title").each((iten, i) => {
        const str = $(i).text().split(' ...')[0];
        const similarVal = similar(text, str);
        console.log(str, `      ========>相似度：${similarVal}`);
        if (similarVal > 60) {
          similarList.push({
            similarTitle: str,
            svalue: similarVal,
            slink: $($(i).find('a.sh_favicon')[0]).attr('href')
          })
        }
      })
      if (similarList.length) {
        results.push({
          ...item,
          similarList: similarList
        })
      }
      console.log('-----------------------------------------------------------------------------------')
      console.log(' ')
      next()
    });
  }).on('error', (err) => {
    console.log('error ===================>', err)
    errorList.push(item);
    next()
  });
}

checkTitle(count)


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