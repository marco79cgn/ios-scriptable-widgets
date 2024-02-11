// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: car;
const widgetHeadline = "Smart #1"

let hashes
try {
  hashes = importModule('modules/hashes')
  new hashes.MD5()
  new hashes.SHA1()
} catch (exception) {
  await showError('Hashes file unavailable or unreadable!')
  return
}

let userName
let password
let vin
const param = args.widgetParameter
if (param != null && param.length > 0) {
  const paramArray = param.split(';')
  if (paramArray.length >= 3) {
    userName = paramArray[0]
    password = paramArray[1]
    vin = paramArray[2]
  } else {
    console.log('Error reading user credentials.')
  }
} else {
  // insert credentials for testing inside the app
  // never share this code with your sensible data!
  userName = '***'
  password = '***'
  vin = '***'
}

const deviceId = randomHexString(16)
let apiTokenRefreshed = false
let credentials = {}

let cachedCredentials = await loadCachedCredentials()
const isEmpty = Object.entries(cachedCredentials).length === 0
if (isEmpty) {
  console.log('Cached credentials file is empty. Creating...')
  cachedCredentials = await initialLogin()
  credentials = cachedCredentials
} else {
  credentials = cachedCredentials
}
if (credentials.hasOwnProperty('apiAccessToken')) {
  console.log('Found apiAccessToken.')
} else {
  console.log('apiAccessToken unavailable. Refreshing...')
  await refreshApiAccessToken()
}

let updateSession = await updateSessionForCar(credentials.apiAccessToken, vin)
if (updateSession.code == 1402) {
  if (apiTokenRefreshed) {
    console.log('Api Token expired and could not be refreshed!')
  } else {
    console.log('Api token expired and neees to be refreshed!')
    let refreshedApiAccessToken = await refreshApiAccessToken()
    if (!refreshedApiAccessToken) {
      cachedCredentials = await initialLogin()
      credentials = cachedCredentials
      refreshedApiAccessToken = await refreshApiAccessToken()
    }
    apiTokenRefreshed = true
    updateSession = await updateSessionForCar(credentials.apiAccessToken, vin)
  }
}

let carData = await getCarInfo(credentials.apiAccessToken)
//console.log(carData)
const batteryState = carData.data.vehicleStatus.additionalVehicleStatus.electricVehicleStatus.chargeLevel
const temperatureInt = carData.data.vehicleStatus.additionalVehicleStatus.climateStatus.interiorTemp
const temperatureExt = carData.data.vehicleStatus.additionalVehicleStatus.climateStatus.exteriorTemp
const temperature = Number.parseFloat(temperatureInt).toFixed(1) + ' °C | ' + Number.parseFloat(temperatureExt).toFixed(1) + ' °C'
const remainingKilometer = carData.data.vehicleStatus.additionalVehicleStatus.electricVehicleStatus.distanceToEmptyOnBatteryOnly
console.log('Battery State: ' + batteryState)
console.log('TemperatureInt: ' + temperatureInt)
console.log('TemperatureExt: ' + temperatureExt)
console.log('RemainingKilometer: ' + remainingKilometer)

let widget = new ListWidget()
await getData()
widget.presentAccessoryRectangular()
Script.setWidget(widget)
Script.complete()

// loads a random track from recent shazams
async function getData() {
  
  widget.addSpacer(2)
  widget.url = "hellosmartapp://"

  let logoStack = widget.addStack()
  logoStack.layoutHorizontally()
  let smartLogo = await getImage("smart-lockscreen.png")
  logoStack.addSpacer(3)
  let image = logoStack.addImage(smartLogo)
  image.imageSize = new Size(16,16)
  logoStack.addSpacer(6)
  let headerStack = logoStack.addStack()
  headerStack.layoutVertically()
  headerStack.addSpacer(1)
  let headerText = headerStack.addText(widgetHeadline)
  headerText.font = Font.mediumRoundedSystemFont(12)

  widget.addSpacer(5)

  let temperatureStack = widget.addStack()
  temperatureStack.layoutHorizontally()
  let tempLogo = await getImage("temperature-icon.png")
  temperatureStack.addSpacer(2)
  let tempImage = temperatureStack.addImage(tempLogo)
  tempImage.imageSize = new Size(16, 16)
  temperatureStack.addSpacer(7)
  let tempTextStack = temperatureStack.addStack()
  tempTextStack.layoutVertically()
  tempTextStack.addSpacer(1)
  let tempTxt = tempTextStack.addText(temperature)
  tempTxt.font = Font.lightRoundedSystemFont(13)

  widget.addSpacer(5)

  let reachStack = widget.addStack()
  reachStack.layoutHorizontally()
  let reachLogo = await getImage('reachability.png')
  let reachImage = reachStack.addImage(reachLogo)
  reachImage.imageSize = new Size(18,18)
  reachStack.addSpacer(7)
  let reachTextStack = reachStack.addStack()
  reachTextStack.layoutVertically()
  reachTextStack.addSpacer(1)
  let reachTxt = reachTextStack.addText(remainingKilometer + ' km')
  reachTxt.font = Font.lightRoundedSystemFont(13)
  reachStack.addSpacer(10)
  let batteryLogo = await getImage('battery.png')
  let batteryImage = reachStack.addImage(batteryLogo)
  batteryImage.imageSize = new Size(16,16)
  reachStack.addSpacer(7)
  let batteryTextStack = reachStack.addStack()
  batteryTextStack.layoutVertically()
  batteryTextStack.addSpacer(1)
  let batteryTxt = batteryTextStack.addText(batteryState + ' %')
  batteryTxt.font = Font.lightRoundedSystemFont(13)

}

// random number, min and max included 
function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

// download an image from a given url
async function loadImage(imgUrl) {
  let req = new Request(imgUrl)
  req.allowInsecureRequest = true
  let image = await req.loadImage()
  return image
}

// get image from local filestore or download it only once
async function getImage(image) {
  let fm = FileManager.local()
  let dir = fm.documentsDirectory()
  let path = fm.joinPath(dir, image)
  if (fm.fileExists(path)) {
    return fm.readImage(path)
  } else {
    // download once
    let imageUrl
    switch (image) {
      case 'smart-lockscreen.png':
        imageUrl = "https://i.imgur.com/1tJMoG1.png";
        break;
      case 'temperature-icon.png':
        imageUrl = "https://i.imgur.com/U8jq3QB.png";
        break;
      case 'reachability.png':
        imageUrl = "https://i.imgur.com/WCx3VWK.png";
        break;
      case 'battery.png':
        imageUrl = "https://i.imgur.com/xz6v8os.png";
        break;
      default:
        console.log(`Sorry, couldn't find ${image}.`);
    }
    let iconImage = await loadImage(imageUrl)
    fm.writeImage(path, iconImage)
    return iconImage
  }
}

// returns a pseudo random value as hex
function randomHexString (len) {
  charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  var randomString = ''
  for (var i = 0; i < len; i++) {
    var randomPoz = Math.floor(Math.random() * charSet.length)
    randomString += charSet.substring(randomPoz, randomPoz + 1)
  }

  var result = ''
  for (var i = 0; i < randomString.length; i++) {
    result += randomString.charCodeAt(i).toString(16)
  }
  return result
}

// returns url query params as json
function getUrlParams (url) {
  var regex = /[?&]([^=#]+)=([^&#]*)/g,
    params = {},
    match
  while ((match = regex.exec(url))) {
    params[match[1]] = match[2]
  }
  return params
}

// load credentials from iCloud Drive
async function loadCachedCredentials () {
  // load existing credentials from iCloud Drive
  const fm = FileManager.iCloud()
  const dir = fm.documentsDirectory()
  const path = fm.joinPath(dir, 'smart-credentials.json')
  const credentials = Data.fromFile(path)
  if (credentials != null) {
    return JSON.parse(credentials.toRawString())
  } else {
    return new Object()
  }
}

// save smart api credentials to iCloud Drive
async function saveCredentials (credentials) {
  const fm = FileManager.iCloud()
  const dir = fm.documentsDirectory()
  const path = fm.joinPath(dir, 'smart-credentials.json')
  fm.writeString(path, JSON.stringify(credentials))
}

// initial login to get credentials for the first time or after login expiration
async function initialLogin () {
  console.log('Starting complete login process from scratch.')
  const url =
    'https://awsapi.future.smart.com/login-app/api/v1/authorize?uiLocales=de-DE&uiLocales=de-DE'
  let req = new Request(url)
  req.headers = {
    'x-app-id': 'SmartAPPEU',
    accept: 'application/json;responseformat=3',
    'x-requested-with': 'com.smart.hellosmart',
    'upgrade-insecure-requests': '1',
    'user-agent':
      'Mozilla/5.0 (Linux; Android 9; ANE-LX1 Build/HUAWEIANE-L21; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Mobile Safari/537.36',
    'content-type': 'application/json; charset=utf-8',
    'sec-fetch-site': 'none',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-user': '?1',
    'sec-fetch-dest': 'document',
    'accept-language': 'de-DE,de;q=0.9,en-DE;q=0.8,en-US;q=0.7,en;q=0.6'
  }
  let contextResult = await req.load()
  const urlParams = getUrlParams(req.response.url)
  const context = urlParams.context

  const loginUrl = 'https://auth.smart.com/accounts.login'
  req = new Request(loginUrl)
  req.method = 'POST'
  req.headers = {
    accept: '*/*',
    'accept-language': 'de',
    'content-type': 'application/x-www-form-urlencoded',
    'x-requested-with': 'com.smart.hellosmart',
    cookie:
      'gmid=gmid.ver4.AcbHPqUK5Q.xOaWPhRTb7gy-6-GUW6cxQVf_t7LhbmeabBNXqqqsT6dpLJLOWCGWZM07EkmfM4j.u2AMsCQ9ZsKc6ugOIoVwCgryB2KJNCnbBrlY6pq0W2Ww7sxSkUa9_WTPBIwAufhCQYkb7gA2eUbb6EIZjrl5mQ.sc3; ucid=hPzasmkDyTeHN0DinLRGvw; hasGmid=ver4; gig_bootstrap_3_L94eyQ-wvJhWm7Afp1oBhfTGXZArUfSHHW9p9Pncg513hZELXsxCfMWHrF8f5P5a=auth_ver4',
    origin: 'https://app.id.smart.com',
    'user-agent': 'Hello smart/1.4.0 (iPhone; iOS 17.1; Scale/3.00)'
  }
  req.body =
    'loginID=' +
    encodeURIComponent(userName) +
    '&password=' +
    encodeURIComponent(password) +
    '&sessionExpiration=2592000&targetEnv=jssdk&include=profile%2Cdata%2Cemails%2Csubscriptions%2Cpreferences%2C&includeUserInfo=true&loginMode=standard&lang=de&APIKey=3_L94eyQ-wvJhWm7Afp1oBhfTGXZArUfSHHW9p9Pncg513hZELXsxCfMWHrF8f5P5a&source=showScreenSet&sdk=js_latest&authMode=cookie&pageURL=https%3A%2F%2Fapp.id.smart.com%2Flogin%3Fgig_ui_locales%3Dde-DE&sdkBuild=15482&format=json&riskContext=%7B%22b0%22%3A41187%2C%22b1%22%3A%5B0%2C2%2C3%2C1%5D%2C%22b2%22%3A4%2C%22b3%22%3A%5B%22-23%7C0.383%22%2C%22-81.33333587646484%7C0.236%22%5D%2C%22b4%22%3A3%2C%22b5%22%3A1%2C%22b6%22%3A%22Mozilla%2F5.0%20%28Linux%3B%20Android%209%3B%20ANE-LX1%20Build%2FHUAWEIANE-L21%3B%20wv%29%20AppleWebKit%2F537.36%20%28KHTML%2C%20like%20Gecko%29%20Version%2F4.0%20Chrome%2F118.0.0.0%20Mobile%20Safari%2F537.36%22%2C%22b7%22%3A%5B%5D%2C%22b8%22%3A%2216%3A33%3A26%22%2C%22b9%22%3A-60%2C%22b10%22%3Anull%2C%22b11%22%3Afalse%2C%22b12%22%3A%7B%22charging%22%3Atrue%2C%22chargingTime%22%3Anull%2C%22dischargingTime%22%3Anull%2C%22level%22%3A0.58%7D%2C%22b13%22%3A%5B5%2C%22360%7C760%7C24%22%2Cfalse%2Ctrue%5D%7D'
  let loginResult = await req.loadJSON()
  console.log('Login token result http status code: ' + req.response.statusCode)
  const loginToken = loginResult.sessionInfo.login_token

  const authUrl =
    'https://auth.smart.com/oidc/op/v1.0/3_L94eyQ-wvJhWm7Afp1oBhfTGXZArUfSHHW9p9Pncg513hZELXsxCfMWHrF8f5P5a/authorize/continue?context=' +
    context +
    '&login_token=' +
    loginToken
  const cookieValue =
    'gmid=gmid.ver4.AcbHPqUK5Q.xOaWPhRTb7gy-6-GUW6cxQVf_t7LhbmeabBNXqqqsT6dpLJLOWCGWZM07EkmfM4j.u2AMsCQ9ZsKc6ugOIoVwCgryB2KJNCnbBrlY6pq0W2Ww7sxSkUa9_WTPBIwAufhCQYkb7gA2eUbb6EIZjrl5mQ.sc3; ucid=hPzasmkDyTeHN0DinLRGvw; hasGmid=ver4; gig_bootstrap_3_L94eyQ-wvJhWm7Afp1oBhfTGXZArUfSHHW9p9Pncg513hZELXsxCfMWHrF8f5P5a=auth_ver4; glt_3_L94eyQ-wvJhWm7Afp1oBhfTGXZArUfSHHW9p9Pncg513hZELXsxCfMWHrF8f5P5a=' +
    loginToken
  req = new Request(authUrl)
  req.headers = {
    accept: '*/*',
    cookie: cookieValue,
    'accept-language': 'de-DE,de;q=0.9,en-DE;q=0.8,en-US;q=0.7,en;q=0.6',
    'x-requested-with': 'com.smart.hellosmart',
    'user-agent': 'Hello smart/1.4.0 (iPhone; iOS 17.1; Scale/3.00)'
  }
  let authResult = await req.load()
  req = new Request(req.response.url)
  let finalAuthResult = await req.load()
  const tokens = getUrlParams(req.response.url)
  // console.log('Login finished. Saving credentials to iCloud: ' + JSON.stringify(tokens))
  await saveCredentials(tokens)
  return tokens
}

// get credentials for configured car/vin
async function updateSessionForCar (access_token, vin) {
  const timestamp = Date.now().toString()
  const nonce = randomHexString(16)
  const params = {}
  let url = '/device-platform/user/session/update'
  const payload = {
    vin: vin,
    sessionToken: access_token,
    language: ''
  }
  const sign = createSignature(nonce, params, timestamp, 'POST', url, payload)
  url = 'https://api.ecloudeu.com' + url
  let req = new Request(url)
  req.method = 'POST'
  req.headers = {
    'x-app-id': 'SmartAPPEU',
    accept: 'application/json;responseformat=3',
    'x-agent-type': 'iOS',
    'x-device-type': 'mobile',
    'x-operator-code': 'SMART',
    'x-device-identifier': deviceId,
    'x-env-type': 'production',
    'x-version': 'smartNew',
    'accept-language': 'en_US',
    'x-api-signature-version': '1.0',
    'x-api-signature-nonce': nonce,
    'x-device-manufacture': 'Apple',
    'x-device-brand': 'Apple',
    'x-device-model': 'iPhone',
    'x-agent-version': '17.1',
    authorization: access_token,
    'content-type': 'application/json; charset=utf-8',
    'user-agent': 'Hello smart/1.4.0 (iPhone; iOS 17.1; Scale/3.00)',
    'x-signature': sign,
    'x-timestamp': timestamp
  }
  req.body = JSON.stringify(payload)
  const carSessionResult = await req.loadJSON()
  const statusCode = req.response.statusCode
  console.log('CarSession http status code: ' + statusCode)
  console.log('CarSession api status code: ' + carSessionResult.code)
  //console.log(carSessionResult);
  return carSessionResult
}

// refreshes the api access token (valid for a few hours)
async function refreshApiAccessToken () {
  const timestamp = Date.now().toString()
  const nonce = randomHexString(16)
  const params = { identity_type: 'smart' }
  let url = '/auth/account/session/secure'
  let data = { accessToken: credentials.access_token }

  const sign = createSignature(nonce, params, timestamp, 'POST', url, data)
  url =
    'https://api.ecloudeu.com/auth/account/session/secure?identity_type=smart'
  let req = new Request(url)
  req.method = 'POST'
  req.headers = {
    'x-app-id': 'SmartAPPEU',
    accept: 'application/json;responseformat=3',
    'x-agent-type': 'iOS',
    'x-device-type': 'mobile',
    'x-operator-code': 'SMART',
    'x-device-identifier': deviceId,
    'x-env-type': 'production',
    'x-version': 'smartNew',
    'accept-language': 'en_US',
    'x-api-signature-version': '1.0',
    'x-api-signature-nonce': nonce,
    'x-device-manufacture': 'Apple',
    'x-device-brand': 'Apple',
    'x-device-model': 'iPhone',
    'x-agent-version': '17.1',
    'Content-Type': 'application/json',
    'user-agent': 'Hello smart/1.4.0 (iPhone; iOS 17.1; Scale/3.00)',
    'x-signature': sign,
    'x-timestamp': timestamp
  }
  req.body = JSON.stringify({ accessToken: credentials.access_token })
  let result = await req.loadJSON()
  if (result.code == 1501) {
    console.log(
      'Both access and login token expired. Logging in from the beginning.'
    )
    return null
  }
  console.log('currentToken http status code: ' + req.response.statusCode)
  console.log('currentToken api status code: ' + result.code)
  credentials.apiAccessToken = result.data.accessToken
  credentials.userId = result.data.userId
  console.log('Saving new credentials with updated api access token.')
  await saveCredentials(credentials)
  return result.data.accessToken
}

async function getCarInfo (access_token) {
  const timestamp = Date.now().toString()
  const nonce = randomHexString(16)
  let url = '/remote-control/vehicle/status/' + vin
  const params = {
    latest: true,
    target: 'basic%2Cmore',
    userId: credentials.userId
  }
  const sign = createSignature(nonce, params, timestamp, 'GET', url)
  url =
    'https://api.ecloudeu.com' +
    url +
    '?latest=true&target=basic%2Cmore&userId=' +
    credentials.userId
  let req = new Request(url)
  req.method = 'GET'
  req.headers = {
    'x-app-id': 'SmartAPPEU',
    accept: 'application/json;responseformat=3',
    'x-agent-type': 'iOS',
    'x-device-type': 'mobile',
    'x-operator-code': 'SMART',
    'x-device-identifier': deviceId,
    'x-env-type': 'production',
    'x-version': 'smartNew',
    'accept-language': 'en_US',
    'x-api-signature-version': '1.0',
    'x-api-signature-nonce': nonce,
    'x-device-manufacture': 'Apple',
    'x-device-brand': 'Apple',
    'x-device-model': 'iPhone',
    'x-agent-version': '17.1',
    authorization: access_token,
    'content-type': 'application/json; charset=utf-8',
    'user-agent': 'Hello smart/1.4.0 (iPhone; iOS 17.1; Scale/3.00)',
    'x-signature': sign,
    'x-timestamp': timestamp
  }

  let carData = await req.loadJSON()
  const statusCode = req.response.statusCode
  console.log('carInfo http status code: ' + statusCode)
  console.log('carInfo api status code: ' + carData.code)
  // console.log(carData);
  return carData
}

// sign http requests for smart api
function createSignature (nonce, urlParams, timestamp, method, url, body) {
  var MD5 = new hashes.MD5()
  const md5Hash = body
    ? MD5.b64(JSON.stringify(body))
    : '1B2M2Y8AsgTpgAmY7PhCfg=='
  let urlParameters = Object.entries(urlParams)
    .map(e => e.join('='))
    .join('&')
  const payload = `application/json;responseformat=3
x-api-signature-nonce:${nonce}
x-api-signature-version:1.0

${urlParameters}
${md5Hash}
${timestamp}
${method}
${url}`
  const secret = atob('NzRlNzQ2OWFmZjUwNDJiYmJlZDdiYmIxYjM2YzE1ZTk=')
  const result = new hashes.SHA1().b64_hmac(secret, payload)
  return result
}


//
//  make sure to copy this script until the end!
//
