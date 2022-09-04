#!/usr/bin/env node
const fs = require("fs");              //操作文件，读写文件
const path = require('path');
const https = require("https");        //网络请求
const cheerio = require("cheerio");    //扩展模块
const axios = require('axios');
const nodeXlsx = require('node-xlsx')	 //引用node-xlsx模块
const { fsExistsSync, getSuffix, copyWithStream, printHelp, readDir, outputHtml, similar } = require('./util');

axios.defaults.withCredentials = true
const pwd = process.cwd(); // 当前执行程序的路径 同 path.resolve('./')
const currentDir = pwd.substr(pwd.lastIndexOf('/') + 1);  // 当前执行程序所在的文件名
const pwd_ = path.resolve(pwd, '..');  // 当前执行程序的路径的上一级路径
const mode = process.argv[2]; // 命令 tit_check
const targetPath = process.argv[3] || path.join(pwd_, `${currentDir}_`); // 目标存放目录(用户数据 或 默认当前执行程序的路径的上一级路径+当前文件夹名+_)

const excel = nodeXlsx.parse(path.join(__dirname, 'copyright-list.xlsx'))	//读取excel表格
const playTitle = excel[0].data.map(item => item[0]) // 需要查重的所有剧名
console.log(playTitle)

if (!mode) {   // 没有输入命令 return
  printHelp()
  return
}

let titleList = [];
// 获取当前文件夹下的所有 .mp4 文件的标题
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

let count = 0;      // 遍历指针
const results = []; // 查重结果存放栈
// results 数据格式
// {
//     title: path.basename(file, '.mp4'),
//     path: _src
//     similarList: similarList
// }

let errorList = []; // 搜索错误存放栈，队列执行完后会重新执行查重错误栈中的标题

// bing 查重相关
const next = () => {
  if (count < titleList.length - 1) {
    count++
    checkBing(count)
  } else {
    if (errorList.length) {
      console.log('错误列表：', errorList)
      titleList = errorList;
      errorList = [];
      count = 0;
      checkBing(count)
    } else {
      outputHtml(results, '必应查重结果')
    }
  }
}
const checkBing = (index) => {
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

// 小猪 查重相关
const nextXiaozu = () => {
  if (count < titleList.length - 1) {
    count++
    checkXiaozhu(count)
  } else {
    if (errorList.length) {
      console.log('错误列表：', errorList)
      titleList = errorList;
      errorList = [];
      count = 0;
      checkXiaozhu(count)
    } else {
      outputHtml(results, '小猪APP查重结果')
    }
  }
}
const checkXiaozhu = (index) => {
  const item = titleList[index];
  const text = item.title;
  const wz = `https://app.xiaozhuyouban.com/video?signature=ZTRjN2FhMWNmYmNiZTU5YjQ1NGUzNmIzN2I4MTc0NjQ2NTNlMDhhYWM0NDEwMjg1YTZlNzYyZjY2MDY2N2ZhZDE2NjIwMjY0NzU3OTA==&timestamp=${new Date().getTime()}&channel=android-2 HTTP/1.1`; //网址
  console.log(`-------------- 正在比对第 ${index + 1} / ${titleList.length} 条：${text} 【比对结果】--------------`)

  axios.post(wz, {
    keyword: text,
    page: 1,
    device_code: '653e08aac4410285a6e762f660667fad'
  }, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }).then(res => {
    if (res.status === 200) {
      const list = res.data.data;
      if (list.length) {
        const similarList = [];
        list.forEach(val => {
          const similarVal = similar(text, val.title);
          console.log(val.title, `      ========>相似度：${similarVal}`);
          if (similarVal > 60) {
            similarList.push({
              similarTitle: val.title,
              svalue: similarVal,
              slink: val.url
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
      }
      nextXiaozu()
    } else {
      errorList.push(item);
      nextXiaozu()
    }
  }).catch(error => {
    console.log('error ===================>', error)
    errorList.push(item);
    nextXiaozu()
  })
}

let cookie = ''
let token = ''
// 查询小猪版权
const getCsrfToken = () => {
  return new Promise((resolve, reject) => {
    axios.get('https://mp.xiaozhuyouban.com', {
      headers: {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        "origin": "https://mp.xiaozhuyouban.com",
        "referer": "https://mp.xiaozhuyouban.com/",
        'host': 'mp.xiaozhuyouban.com',
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36",
        "x-requested-with": "XMLHttpRequest",
      }
    }).then(res => {
      if (res.status === 200) {
        const $ = cheerio.load(res.data);
        const token = $('meta[name="csrf-token"]').attr('content')
        resolve(token)
      } else {
        reject(null)
      }
    }).catch(err => {
      reject(err)
    })
  })
}
const loginXiaozhu = () => {
  return new Promise((resolve, reject) => {
    axios.post('https://mp.xiaozhuyouban.com/signin', {
      xsrfToken: token,
      mobile: '17102542425',
      password: 'xls111111',
      'check[captcha_id]': '',
      'check[lot_number]': '',
      'check[pass_token]': '',
      'check[gen_time]': '',
      'check[captcha_output]': '',
    }, {
      headers: {
        'accept': '*/*',
        'content-type': 'multipart/form-data',
        'Cookie': `XSRF-TOKEN=${token}`,
        'host': 'mp.xiaozhuyouban.com',
        "origin": "https://mp.xiaozhuyouban.com",
        "referer": "https://mp.xiaozhuyouban.com/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36",
        "x-requested-with": "XMLHttpRequest"
      }
    }).then(res => {
      const cks = [];
      res.headers['set-cookie'].map(item => {
        cks.push(item.split(';')[0])
      })
      const cookie = cks.join('; ')
      resolve(cookie)
    }).catch(error => {
      reject(error)
    })
  })
}
let page = 2;
const copyrightList = [];
const getCopyRight = () => {
  axios.post('https://mp.xiaozhuyouban.com/copyright/resource', {
    keyword: '',
    year: 0,
    region: 0,
    genre: '电视剧',
    level: 0,
    level1: 0,
    creator_type: 0,
    hot: 0,
    score: 0,
    onstatus: 0,
    page,
  }, {
    headers: {
      'accept': '*/*',
      'content-type': 'multipart/form-data',
      'host': 'mp.xiaozhuyouban.com',
      "origin": "https://mp.xiaozhuyouban.com",
      "referer": "https://mp.xiaozhuyouban.com/copyright/resource",
      'Cookie': cookie,
      'X-CSRF-TOKEN': token,
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    }
  }).then(res => {
    if (res.status === 200 && res.data.code == 0) {
      const { resource = [] } = res.data.data
      copyrightList.push(...resource)
      console.log(`已加载 ${page} 页，总计：${copyrightList.length} 条`)
      if (resource.length === 15) {
        page++;
        getCopyRight();
      } else {
        console.log('===========================版权库加载完成===============================')
        console.log('总条数：', copyrightList.length)
        outputExcel();
      }
    } else {
      getCopyRight();
    }
  }).catch(error => {
    console.log(error)
    getCopyRight();
  })
}

function outputExcel() {
  const excelList = copyrightList.map(item => [item.title, item.category, item.level, item.genre]);
  let buffer = nodeXlsx.build([
    {
      name: 'sheet1',
      data: excelList
    }
  ]);
  console.log('表格导出中。。。。。。。')
  fs.writeFileSync(path.join(__dirname, 'copyright-list.xlsx'), buffer, { 'flag': 'w' });
  console.log('表格导出完成')
}

const getXiaozhuCopyright = async () => {
  const tk = await getCsrfToken();
  token = tk
  const ck = await loginXiaozhu();
  cookie = ck;
  getCopyRight();
}

switch (mode) {
  case 'bing':
    console.log('开始通过bing查重......')
    checkBing(count)
    break;
  case 'xiaozhu':
    console.log('开始通过小猪APP搜索查重......')
    checkXiaozhu(count)
    break;
  case 'copyright':
    console.log('开始获取小猪版权......')
    getXiaozhuCopyright();
    break
  default:
    printHelp()
    break;
}