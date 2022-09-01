/*
 * @Author       : frank
 * @Date         : 2022-08-28 21:03:36
 * @LastEditTime : 2022-09-01 22:39:37
 * @LastEditors  : frank
 * @Description  : In User Settings Edit
 */
const fs = require('fs');
const path = require('path');

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
  console.log('Usage: check <command>');
  console.log('')
  console.log(`where <command> is one of: "bing", "xiaozhu", "help"`);
  console.log('')
  console.log('converter bing            通过bing查重')
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
    }
  });
}


module.exports = {
  fsExistsSync,
  getSuffix,
  copyWithStream,
  printHelp,
  readDir,
  outputHtml
}