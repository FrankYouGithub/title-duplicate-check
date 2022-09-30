/*
 * @Author       : frank
 * @Date         : 2022-08-28 21:03:36
 * @LastEditTime : 2022-09-30 11:40:18
 * @LastEditors  : frank
 * @Description  : In User Settings Edit
 */
const fs = require('fs');
const path = require('path');
const pwd = process.cwd(); // 当前执行程序的路径 同 path.resolve('./')
const currentDir = pwd.substr(pwd.lastIndexOf('/') + 1);  // 当前执行程序所在的文件名
var open = require('child_process');

/**
 * 判断文件/文件夹是否存在
 * @param {String} PATH 文件路径
 */
const fsExistsSync = (PATH) => {
  try {
    const stats = fs.statSync(PATH);
  } catch (error) {
    return false
  }
  return true
}

/**
 * 获取文件后缀名
 * @param {String} fileName 
 */
const getSuffix = (fileName) => {
  return path.extname(fileName);
}

/**
 * 拷贝文件内容到指定文件
 * @param {String} _src 源文件
 * @param {String} _dst 目标文件
 */
const copyWithStream = (_src, _dst) => {
  const readable = fs.createReadStream(_src);//创建读取流
  const writable = fs.createWriteStream(_dst);//创建写入流
  readable.pipe(writable);
}

const printHelp = () => {
  console.log('')
  console.log('Usage: check <command>');
  console.log(`where <command> is one of: "bing", "xiaozhu", "help"`);
  console.log('converter bing               通过bing查重')
  console.log('converter xiaozhu            通过小猪APP搜索查重')
}

const ignoreFiles = ['.git'];
function readDir(src) {
  let files = fs.readdirSync(src);
  ignoreFiles.map(item => {
    files = files.filter(v => v !== item);
  })
  return files
}

const outputHtml = (list, title = '查重结果') => {
  let liStr = '';
  list.forEach((item, index) => {
    let aStr = '';
    item.similarList.map(similar => {
      aStr += `<a href="${similar.slink}" target="_blank"><p>${similar.similarTitle} (相似度：${similar.svalue})</p></a>`
    })
    liStr += `<li class="content">
      <div class="stext">
        <p>${index + 1}. ${item.title}</p>
        <p>路径: ${item.path}</p>
      </div>
      <div class="slink">
        ${aStr}
      </div>
    </li>`
  });

  const html = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>标题查重结果</title>
    <style>
      * {
        margin: 0;
        padding: 0
      }
      ul {
        list-style: none;
      }
      li {
        border: 1px solid #000;
        padding: 0 20px;
        line-height: 50px;
      }
      .title {
        display: flex;
      }
      .title p {
        flex: 1;
        size: 20px;
        font-weight: bolder;
      }
      .title p:last-child {
        border-left: 1px solid #000;
        padding-left: 20px;
      }
      .content {
        display: flex;  
      }
      .content .stext {
        flex: 1;
      }
      .content .slink {
        flex: 1;
        border-left: 1px solid #000;
        padding-left: 20px;
      }
    </style>
  </head>
  <body>
    <ul>
      <li>
        <div class="title">
          <p>原标题</p>
          <p>相似标题</p>
        </div>
      </li>
      ${liStr}
    </ul>
  </body>
  </html>`
  fs.writeFile(`${title}.html`, html, error => {
    if (error) {
      console.log(error);
    } else {
      open.exec(`start ${currentDir}/${title}.html`)
    }
  });
}

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


module.exports = {
  fsExistsSync,
  getSuffix,
  copyWithStream,
  printHelp,
  readDir,
  outputHtml,
  similar
}