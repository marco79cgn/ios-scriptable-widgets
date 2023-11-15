// Insert your zip code or the one of your desired Apple Store
let zip = '50670'
// Insert the part number of your desired iPhone
// for example iPhone 14 Pro 256GB Deep Purple
let partNo = "MQ1F3ZD/A"

let params = getParams(args.widgetParameter)
const shopAvailability = await getShopAvailability()

let widget = new ListWidget()
let symbol
if (shopAvailability.message.toLowerCase().indexOf('nicht') >= 0 || shopAvailability.message.toLowerCase().indexOf('ab') >= 0) {
    symbol = widget.addImage(SFSymbol.named("iphone.slash.circle").image)
} else {
    symbol = widget.addImage(SFSymbol.named("iphone.circle").image)
}
symbol.imageSize = new Size(60, 60)
symbol.centerAlignImage()

widget.url = "https://store.apple.com/de/xc/product/" + params.partNo

if (config.runsInApp) {
    widget.presentSmall()
}
Script.setWidget(widget)
Script.complete()

// fetches the local shop availability
async function getShopAvailability() {
    let availabilityMessage
    let productName
    let storeName
    let city
    const url = "https://www.apple.com/de/shop/retail/pickup-message?pl=true&parts.0="
        + params.partNo + "&location=" + params.zip
    let req = new Request(url)
    try {
        let result = await req.loadJSON()
        const store = result.body.stores[0]
        const item = result.body.stores[0].partsAvailability[params.partNo]

        availabilityMessage = item.pickupSearchQuote
        productName = item.messageTypes.regular.storePickupProductTitle
        storeName = store.storeName
        city = store.city

    } catch (exception) {
        console.log("Exception Occured.")
        availabilityMessage = "N/A"
        productName = "Keine Internetverbindung"
        storeName = "Oder ungültige"
        city = "PartNo"
    }
    return { "message": availabilityMessage, "product": productName, "storeName": storeName, "city": city }
}

// parses the widget params to overwrite part number and zip code
function getParams(widgetParams) {
    if (widgetParams) {
        let split = widgetParams.split(';')
        partNo = split[0]
        if (split.length > 1) {
            zip = split[1]
        }
    }
    return { "partNo": partNo, "zip": zip }
}
