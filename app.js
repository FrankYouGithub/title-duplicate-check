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

const excel = nodeXlsx.parse(path.join(__dirname, 'hunjian.xlsx'))	//读取excel表格
const playTitle = excel[0].data.map(item => item[0]) // 需要查重的所有剧名
// console.log(playTitle)

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
  console.log(`-------------- 正在比对第 ${index + 1} / ${titleList.length} 条：${text} 【比对结果】--------------`)
  const data = {
    keyword: text,
    page: 1,
    device_code: '653e08aac4410285a6e762f660667fad'
  };
  var options = {
    method: 'POST',
    url: 'https://app.xiaozhuyouban.com/video?signature=NjUzZTA4YTY5MDM3MzNjZjg0M2UyMTAxMmNlZWVjNmM3OTcwOTc4YWM0NDEwMjg1YTZlNzYyZjY2MDY2N2ZhZDE2NjQyODkxMzk4Nzc==&timestamp=1664289139877&channel=android-2',
    headers: { 'Content-Type': 'multipart/form-data' },
    data: data
  };

  axios.request(options).then(res => {
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
    errorList.push(item);
    nextXiaozu()
  })
}

// 模拟请求
function request(title) {
  console.log(`正在查询-------    ${title}`)
  return new Promise((resolve, reject) => {
    const data = {
      keyword: title,
      page: 1,
      device_code: '653e08aac4410285a6e762f660667fad'
    };
    var options = {
      method: 'POST',
      url: 'https://app.xiaozhuyouban.com/video?signature=NjUzZTA4YTY5MDM3MzNjZjg0M2UyMTAxMmNlZWVjNmM3OTcwOTc4YWM0NDEwMjg1YTZlNzYyZjY2MDY2N2ZhZDE2NjQyODkxMzk4Nzc==&timestamp=1664289139877&channel=android-2',
      headers: { 'Content-Type': 'multipart/form-data' },
      data: data
    };
    axios.request(options).then(res => {
      if (res.status === 200) {
        const list = res.data.data;
        if (list.length) {
          const similarList = [];
          list.forEach(val => {
            const similarVal = similar(title, val.title);
            similarList.push({
              similarTitle: val.title,
              svalue: similarVal,
              slink: val.url
            })
          })
          if (similarList.length) {
            resolve(similarList)
          } else {
            resolve([])
          }
        } else {
          resolve([])
        }
      } else {
        resolve([])
      }
    }).catch(error => {
      resolve([])
    })
  });
}
async function multiRequest(titles, maxNum) {
  let data = titles.map((title, index) => ({ index, title }))
  let result = [] // 存放结果的数组
  // 巧用Array.from, length是开辟的数组长度，这个可以控制最大的并发数量。后面回调方法用于存放异步请求的函数
  let promises = Array.from({ length: Math.min(maxNum, data.length) }, () => getChain(data, result))
  // 利用Promise.all并发执行异步函数
  const res = await Promise.all(promises).then(r => console.log('r', r), err => console.log('err', err))
  // 通过函数参数接收最终的一个结果
  return result
}

async function getChain(data, res = []) {
  // 利用队列的思想，一个个pop出来执行，只要titles还有，就继续执行
  while (res.length == 0 && data.length) {
    let one = data.pop()
    try {
      let urlRes = await request(one.title)
      if (urlRes.length) {
        res.push(urlRes)
      }
    }
    catch (e) {
      console.log('err0', e)
      // res[one.index] = e
    }
  }
}
// 小猪 查重相关
const nextHunjian = () => {
  if (count < titleList.length - 1) {
    count++
    checkhunjian(count)
  } else {
    if (errorList.length) {
      console.log('错误列表：', errorList)
      titleList = errorList;
      errorList = [];
      count = 0;
      checkXiaozhu(count)
    } else {
      console.log('正在导出文件。。。。。。。。。')
      outputHtml(results, '小猪APP查重结果')
    }
  }
}
function checkhunjian(index) {
  const item = titleList[index];
  const title = item.title;
  const [name, text] = title.split('：');
  const titles = [];
  if (playTitle.indexOf(name) == -1) {
    titles.push(title)
  }
  playTitle.map(item => {
    titles.push(`${item}：${text}`)
  })
  titles.push(text)
  console.log(`--------------------------------------------------正在查询 ${index + 1} / ${titleList.length}-----------------------------------------------`)
  multiRequest(titles, 10).then(finalRes => {
    console.log('finalRes--------->', finalRes)
    let similarList = [];
    finalRes.map(vals => {
      if (vals && vals.length) {
        similarList = similarList.concat(vals)
      }
    })
    if (similarList.length) {
      results.push({
        ...item,
        similarList: similarList
      })
    }
    nextHunjian();
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
let page = 1;
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
        outputExcel('copyright-list.xlsx');
      }
    } else {
      getCopyRight();
    }
  }).catch(error => {
    console.log(error)
    getCopyRight();
  })
}
const getRemovedCopyRight = () => {
  axios.post('https://mp.xiaozhuyouban.com/resourcelist', {
    page,
  }, {
    headers: {
      'accept': '*/*',
      'content-type': 'multipart/form-data',
      'host': 'mp.xiaozhuyouban.com',
      "origin": "https://mp.xiaozhuyouban.com",
      "referer": "https://mp.xiaozhuyouban.com/resourcelist",
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
        getRemovedCopyRight();
      } else {
        console.log('===========================已下架版权库加载完成===============================')
        console.log('总条数：', copyrightList.length)
        outputExcel(`removed-copyright-list.xlsx`);
      }
    } else {
      getRemovedCopyRight();
    }
  }).catch(error => {
    console.log(error)
    getRemovedCopyRight();
  })
}

function outputExcel(fileName) {
  const excelList = copyrightList.map(item => [item.title || item.subject, item.category || '', item.level || '', item.genre || '']);
  let buffer = nodeXlsx.build([
    {
      name: 'sheet1',
      data: excelList
    }
  ]);
  console.log('表格导出中。。。。。。。')
  fs.writeFileSync(path.join(__dirname, fileName), buffer, { 'flag': 'w' });
  console.log('表格导出完成')
}

const getXiaozhuCopyright = async () => {
  const tk = await getCsrfToken();
  token = tk
  const ck = await loginXiaozhu();
  cookie = ck;
  getCopyRight();
}
const getXiaozhuRemovedCopyright = async () => {
  const tk = await getCsrfToken();
  token = tk
  const ck = await loginXiaozhu();
  cookie = ck;
  getRemovedCopyRight();
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
  case 'removed':
    console.log('开始获取小猪已下架版权......')
    getXiaozhuRemovedCopyright();
    break
  case 'hunjian':
    console.log('开始通过小猪APP搜索查重混剪视频.......')
    checkhunjian(count)
    break
  default:
    printHelp()
    break;
}