// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: teal; icon-glyph: car;
let hashes
try {
  hashes = importModule('modules/hashes')
  new hashes.MD5()
  new hashes.SHA1()
} catch (exception) {
  await showError('Hashes file unavailable or unreadable!')
  return
}

let userName;
let password;
let vin;
let model;
const param = args.widgetParameter;
if (param != null && param.length > 0) {
  const paramArray = param.split(";")
  if (paramArray.length >= 3) {
    userName = paramArray[0]
    password = paramArray[1]
    vin = paramArray[2]
    if(paramArray.length == 4) {
      model = paramArray[3]
    }
  } else {
    console.log('Error reading user credentials.');
  }
} else {
  // insert credentials for testing inside the app
  // never share this code with your sensible data!
  vin = 'HE***';
  userName = 'm***@***.de';
  password = '***';
}

const deviceId = randomHexString(16)
let apiTokenRefreshed = false
let credentials = {}
// widget colors
const labelColor = new Color('#000080') // widget label color
const labelTextColor = Color.white() // widget label text color
const textColor = new Color('#34443c') // widget text color

// LANGUAGES
const languageMap = {
  en: {
    temperature: 'Temperature',
    range: 'Range',
    location: 'Location',
    unavailable: 'unavailable'
  },

  de: {
    temperature: 'Temperatur',
    range: 'Reichweite',
    location: 'Standort',
    unavailable: 'Nicht verfügbar'
  },

  fr: {
    temperature: 'Température',
    range: 'Autonomie',
    location: 'Position',
    unavailable: 'indisponible'
  }
}

// detects the user's language needed for translation
function detectLanguage () {
  let selected_language = 'en'
  let userLanguages = Device.preferredLanguages()
  userLanguages = userLanguages.map(l => l.toLowerCase())
  let availableLanguages = Object.keys(languageMap)

  // Try to find a match based on the first part of the available languages (i.e., match "es" for "es-ES")
  chunkLoop: for (let language of userLanguages) {
    for (let availableLanguage of availableLanguages) {
      if (language.startsWith(availableLanguage)) {
        selected_language = availableLanguage
        break chunkLoop
      }
    }
  }
  return selected_language
}
const detectedLanguage = detectLanguage()

// create an object to be use for languages
// example: lang.range
function getLanguage () {
  return languageMap[detectedLanguage]
}

//
// main workflow
//
let lang = getLanguage()
let cachedCredentials = await loadCachedCredentials()
const isEmpty = Object.entries(cachedCredentials).length === 0
if (isEmpty) {
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
let geoData = ''

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

const allCars = await getAllCars(credentials.apiAccessToken)
const car = allCars.data.list.find(o => o.vin === vin)
model = car.matCode
let carData = await getCarInfo(credentials.apiAccessToken)

if (carData.code == 1000) {
  geoData = await getGeoData()
} else {
  carData = ''
}

// battery circle graphics
const canvSize = 200
const canvTextSize = 50
const canvas = new DrawContext()
canvas.opaque = false
const battCircleRemainColor = new Color('#32CD33') // battery remaining color
const battCircleDepletedColor = new Color('#E3e3dc') // battery depleted color
const battCircleBGColor = new Color('#fff') // battery circle background color
const canvWidth = 16 // battery circle thickness
const canvRadius = 80 // battery circle radius
canvas.size = new Size(canvSize, canvSize)
canvas.respectScreenScale = true

let widget = new ListWidget()
widget.url = 'hellosmart://'
widget.backgroundColor = Color.white()
widget = await createWidget()
Script.setWidget(widget)
Script.complete()

widget.presentSmall()

async function createWidget () {
  let smartIcon = await getImage('smart-logo.png')
  // 	widget.backgroundColor = new Color("#768178")

  if (carData) {
    const batteryLevel =
      carData.data.vehicleStatus.additionalVehicleStatus.electricVehicleStatus
        .chargeLevel
    widget.setPadding(4, 13, 2, 13)

    let iconStack = widget.addStack()
    iconStack.layoutHorizontally()
    iconStack.addSpacer(50)

    let smartIconImage = iconStack.addImage(smartIcon)
    smartIconImage.imageSize = new Size(42, 10)
    smartIconImage.centerAlignImage()

    let carStack = widget.addStack()

    drawArc(
      Math.floor(batteryLevel * 3.6),
      battCircleRemainColor,
      battCircleDepletedColor,
      batteryLevel.toString() + '%'
    )

    const carIcon = await getImage(model + '.png')
    let carIconImage = carStack.addImage(carIcon)
    carIconImage.imageSize = new Size(75, 57)
    carIconImage.centerAlignImage()

    carStack.addSpacer(9)

    let batteryStack = carStack.addStack()
    batteryStack.layoutVertically()
    const batteryImage = batteryStack.addImage(canvas.getImage())
    batteryImage.imageSize = new Size(55, 55)

    let detailsStack = widget.addStack()
    detailsStack.layoutHorizontally()

    let distanceStack = detailsStack.addStack()
    distanceStack.layoutVertically()

    let temperatureLabelStack = distanceStack.addStack()
    temperatureLabelStack.layoutHorizontally()
    temperatureLabelStack.backgroundColor = labelColor
    temperatureLabelStack.cornerRadius = 4
    temperatureLabelStack.size = new Size(68, 14)

    let temperatureLabel = temperatureLabelStack.addText(lang.temperature)
    temperatureLabel.font = Font.semiboldSystemFont(10)
    temperatureLabel.textColor = labelTextColor

    distanceStack.addSpacer(1)
    let temperature =
      carData.data.vehicleStatus.additionalVehicleStatus.climateStatus
        .interiorTemp
    let temperatureNo = distanceStack.addText(
      Number.parseFloat(temperature).toFixed(1) + '°C'
    )
    temperatureNo.font = Font.semiboldSystemFont(11)
    temperatureNo.textColor = textColor

    detailsStack.addSpacer()

    let mainBatteryStack = detailsStack.addStack()
    mainBatteryStack.layoutVertically()

    let remainingKilometerLabelStack = mainBatteryStack.addStack()
    remainingKilometerLabelStack.layoutHorizontally()
    remainingKilometerLabelStack.backgroundColor = labelColor
    remainingKilometerLabelStack.cornerRadius = 4
    remainingKilometerLabelStack.size = new Size(68, 14)

    let remainingKilometerLabel = remainingKilometerLabelStack.addText(
      lang.range
    )
    remainingKilometerLabel.font = Font.semiboldSystemFont(10)
    remainingKilometerLabel.textColor = labelTextColor

    mainBatteryStack.addSpacer(1)

    let remainingKilometer = carData.data.vehicleStatus.additionalVehicleStatus.electricVehicleStatus.distanceToEmptyOnBatteryOnly

    let remainingKilometerNo = mainBatteryStack.addText(
      Math.round(remainingKilometer) + ' KM'
    )
    remainingKilometerNo.font = Font.semiboldSystemFont(11)
    remainingKilometerNo.textColor = textColor

    widget.addSpacer(2)

    let locationTextStack = widget.addStack()
    locationTextStack.layoutHorizontally()
    locationTextStack.backgroundColor = labelColor
    locationTextStack.cornerRadius = 4
    locationTextStack.size = new Size(56, 14)

    let locationText = locationTextStack.addText(lang.location)
    locationText.font = Font.semiboldSystemFont(10)
    locationText.textColor = labelTextColor

    widget.addSpacer(1)

    // car location
    const road = geoData.address.road || ""
    const houseNumber = geoData.address.house_number || "Unbekannt"
    let street = road + ' ' + houseNumber
    let geoPositionStreetTxt = widget.addText(street)
    geoPositionStreetTxt.font = Font.semiboldSystemFont(11)
    geoPositionStreetTxt.textColor = textColor
    geoPositionStreetTxt.lineLimit = 1
    geoPositionStreetTxt.minimumScaleFactor = 0.8
    const zip = geoData.address.postcode || ""
    const city = geoData.address.city || "Unbekannt"
    let cityFormatted = zip +' ' + city
    let geoPositionCityTxt = widget.addText(cityFormatted)
    geoPositionCityTxt.font = Font.lightSystemFont(10)
    geoPositionCityTxt.textColor = textColor
    geoPositionCityTxt.lineLimit = 1

  } else {
    let smartIconImage = widget.addImage(smartIcon)
    smartIconImage.imageSize = new Size(70, 14)
    smartIconImage.centerAlignImage()

    widget.addSpacer()

    let warningTxt = widget.addText(
      'Error getting data, please double check your credentials.'
    )
    warningTxt.font = Font.semiboldSystemFont(12)
    warningTxt.textColor = textColor
    warningTxt.centerAlignText()
  }
  return widget
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
  credentials.apiAccessToken = result.data.accessToken
  credentials.userId = result.data.userId
  await saveCredentials(credentials)
  return result.data.accessToken
}

// returns all cars of the user
async function getAllCars (access_token) {
  const timestamp = Date.now().toString()
  const nonce = randomHexString(16)
  const params = { needSharedCar: 1, userId: credentials.userId }
  let url = '/device-platform/user/vehicle/secure'
  const sign = createSignature(nonce, params, timestamp, 'GET', url)
  url =
    'https://api.ecloudeu.com' +
    url +
    '?needSharedCar=1&userId=' +
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
  const carsResult = await req.loadJSON()
  const statusCode = req.response.statusCode
  return carsResult
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
  return await req.loadJSON()
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
  return await req.loadJSON()
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
  return new hashes.SHA1().b64_hmac(secret, payload)
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
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'content-type': 'application/json; charset=utf-8'
  }
  await req.load()
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
    '&sessionExpiration=2592000&targetEnv=jssdk&include=profile%2Cdata%2Cemails%2Csubscriptions%2Cpreferences%2C&includeUserInfo=true&loginMode=standard&lang=de&APIKey=3_L94eyQ-wvJhWm7Afp1oBhfTGXZArUfSHHW9p9Pncg513hZELXsxCfMWHrF8f5P5a&source=showScreenSet&sdk=js_latest&authMode=cookie&pageURL=https%3A%2F%2Fapp.id.smart.com%2Flogin%3Fgig_ui_locales%3Dde-DE&sdkBuild=15482&format=json&riskContext=%7B%22b0%22%3A41187%2C%22b1%22%3A%5B0%2C2%2C3%2C1%5D%2C%22b2%22%3A4%2C%22b3%22%3A%5B%22-23%7C0.383%22%2C%22-81.33333587646484%7C0.236%22%5D%2C%22b4%22%3A3%2C%22b5%22%3A1%2C%22b6%22%3A%22Hello%20smart%2F1.4.0%20%28iPhone%3B%20iOS%2017.1%3B%20Scale%2F3.00%29%22%2C%22b7%22%3A%5B%5D%2C%22b8%22%3A%2216%3A33%3A26%22%2C%22b9%22%3A-60%2C%22b10%22%3Anull%2C%22b11%22%3Afalse%2C%22b12%22%3A%7B%22charging%22%3Afalse%2C%22chargingTime%22%3Anull%2C%22dischargingTime%22%3Anull%2C%22level%22%3A0.58%7D%2C%22b13%22%3A%5B5%2C%22360%7C760%7C24%22%2Cfalse%2Ctrue%5D%7D'
  let loginResult = await req.loadJSON()
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
  const authResult = await req.load()
  req = new Request(req.response.url)
  // follow redirect
  const finalAuthResult = await req.load()
  const tokens = getUrlParams(req.response.url)
  await saveCredentials(tokens)
  return tokens
}

// save smart api credentials to iCloud Drive
async function saveCredentials (credentials) {
  const fm = FileManager.iCloud()
  const dir = fm.documentsDirectory()
  const path = fm.joinPath(dir, 'smart-credentials.json')
  fm.writeString(path, JSON.stringify(credentials))
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

// resolve geo location
async function getGeoData () {
  let latitude = carData.data.vehicleStatus.basicVehicleStatus.position.latitude
  latitude = latitude / 3600000
  let longitude =
    carData.data.vehicleStatus.basicVehicleStatus.position.longitude
  longitude = longitude / 3600000
  let geoData
  if (longitude == 0 && latitude == 0) {
    console.log('Geo data unavailable!')
    geoData = {
      address: {
        road: lang.unavailable,
        house_number: '',
        postcode: '',
        city: '',
        city_district: ''
      }
    }
  } else {
    const url =
      'https://geocode.maps.co/reverse?lat=' + latitude + '&lon=' + longitude
    const req = new Request(url)
    geoData = await req.loadJSON()
  }
  return geoData
}

// get images from local filestore or download them once
async function getImage (image) {
  let fm = FileManager.local()
  let dir = fm.documentsDirectory()
  let path = fm.joinPath(dir, image)
  if (fm.fileExists(path)) {
    return fm.readImage(path)
  } else {
    // download once
    let imageUrl
    if (image === 'smart-logo.png') {
      imageUrl = 'https://i.imgur.com/MM0UI31.png'
    } else {
      imageUrl =
        'https://s7.future.smart.com/is/image/smarteurope/ppo_' +
        model +
        ':16-9?$smartResponsiveHiDPI$&wid=305&hei=232'
    }
    let iconImage = await loadImage(imageUrl)
    fm.writeImage(path, iconImage)
    return iconImage
  }
}

// helper function to download an image from a given url
async function loadImage (imgUrl) {
  const req = new Request(imgUrl)
  return await req.loadImage()
}

// draws the battery circle
function drawArc (deg, fillColor, strokeColor, label) {
  let ctr = new Point(canvSize / 2, canvSize / 2),
    bgx = ctr.x - canvRadius
  bgy = ctr.y - canvRadius
  bgd = 2 * canvRadius
  bgr = new Rect(bgx, bgy, bgd, bgd)

  canvas.opaque = false

  canvas.setFillColor(fillColor)
  canvas.setStrokeColor(strokeColor)
  canvas.setLineWidth(canvWidth)
  canvas.strokeEllipse(bgr)

  for (t = 0; t < deg; t++) {
    rect_x = ctr.x + canvRadius * sinDeg(t) - canvWidth / 2
    rect_y = ctr.y - canvRadius * cosDeg(t) - canvWidth / 2
    rect_r = new Rect(rect_x, rect_y, canvWidth, canvWidth)
    canvas.fillEllipse(rect_r)
  }
  // attempt to draw label/icon
  const canvLabelRect = new Rect(0, 100 - canvTextSize / 2 - 8, canvSize, 200)
  canvas.setTextAlignedCenter()
  canvas.setFont(Font.boldSystemFont(canvTextSize))
  canvas.setTextColor(new Color('#000080'))
  canvas.drawTextInRect(label, canvLabelRect)
  // return canvas.getImage()
}

// helper function for the battery circle
function sinDeg (deg) {
  return Math.sin((deg * Math.PI) / 180)
}

// helper function for the battery circle
function cosDeg (deg) {
  return Math.cos((deg * Math.PI) / 180)
}

async function showError (errorMessage) {
  let widget = new ListWidget()
  widget.url = 'hellosmart://'
  widget.backgroundColor = Color.white()

  let smartIcon = await getImage('smart-logo.png')
  let smartIconImage = widget.addImage(smartIcon)
  smartIconImage.imageSize = new Size(70, 14)
  smartIconImage.centerAlignImage()
  widget.addSpacer()
  let warningTxt = widget.addText(errorMessage)
  warningTxt.font = Font.semiboldSystemFont(12)
  warningTxt.textColor = new Color('#34443c')
  warningTxt.centerAlignText()
  Script.setWidget(widget)
  Script.complete()
  widget.presentSmall()
}

//
// ATTENTION: Make sure to copy the script until the end!
//
