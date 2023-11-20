## Smart #1 Info Widget

<img src="https://github.com/marco79cgn/ios-scriptable-widgets/assets/9810829/70dce8ce-d60c-472e-911e-9cdb212c4555" width="400"/>

<br>iOS Scriptable widget that shows basic information of your Smart #1 car like the current position and battery state. Tapping on the widget will open the official [Hello Smart app](https://apps.apple.com/de/app/hello-smart/id6443878915).

### Setup

- Create a folder named `modules` inside your iCloud Drive Scriptable folder.
- Download the file [hashes.js](https://raw.githubusercontent.com/marco79cgn/ios-scriptable-widgets/main/smart/modules/hashes.js) into the modules folder you just created
- Open the Scriptable app on your iPhone, click on the "+" sign on the upper right, copy the [source code](https://raw.githubusercontent.com/marco79cgn/ios-scriptable-widgets/main/smart/smart-one-info-small.js) above and paste it inside.
- Name the script (at the top of the App) and save it by pressing "Done" in the upper left.
- Go to your homescreen, long press anywhere and configure a new Scriptable widget with small size. Assign the created widget.
- Insert your real username, password, and vin as widget parameter, separated by semicolon: `username;password;vin`
<img src="https://github.com/marco79cgn/ios-scriptable-widgets/assets/9810829/738695f6-0c7e-4bf3-87e9-440777b2d82c" width="250"/>

- optional: you could also edit your credentials inside the script (lines 20-22), but never give this script to anyone with your hardcoded credentials!

### ToDo

- there is no real darkmode yet
- controlling the car (e.g. temperature) not yet implemented and difficult because of Smart internals (only one user can be logged in at the same time)
- Tip: use another user for this script who has access to your car through the digital key

### Disclaimer
Es handelt sich um ein von mir selbst entwickeltes Spaßprojekt, **kein** offizielles Produkt der Marke smart. Ich stehe in keinerlei Beziehung zu smart und bekomme weder Provision noch sonstiges.
