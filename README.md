## Google Smarthome Switch
Minimal example implementation of Google Assistant Smarthome Actions to control a switch

Here is an stripped down example of adding a switch in Google Smarthome so you can use your voice
to control something.

### Create and set up project in Actions Console
1. Use the Actions on Google Console to add a new project with a name of your choosing and click Create Project.
1. Select Home Control, then click Smart Home.

### Get your JWT token

1. Navigate to the [Google Cloud Console API Manager](https://console.developers.google.com/apis) for your project id.
1. Enable the HomeGraph API.
1. Navigate to the Google Cloud Console API & Services page
1. Select Create Credentials and create a Service account key
    1. Create a new Service account
    1. Use the role Service Account > Service Account Token Creator
1. Create the account and download a JSON file. Save this as src/smart-home-key.json.

```bash
npm install
npm run build
npm run start
```

Once you have this local server running, in another terminal, start ngrok to expose it to the outside world.

```bash
# install ngrok if you don't have it
npm install ngrok -g
# run it
ngrok http 3000
``` 

You will see some output, including
`Forwarding  https://{random-id}.ngrok.io -> http://localhost:3000`

(Hint: One of the links in ngrok output, "Web Interface" lets you study the payloads Google is sending to your service)

1. Navigate back to the [Actions on Google Console](https://console.actions.google.com/).
1. From the top menu under Develop, click on Actions (left nav). Click on Add your first action and choose your app's language(s).
1. Enter the URL https://{random-id}.ngrok.io/smarthome for fulfillment and click Done.
1. On the left navigation menu, click on Account Linking.
    1. Select No, I only want to allow account creation on my website. Click Next.
    1. For Linking Type, select OAuth.
    1. For Grant Type, select 'Authorization Code' for Grant Type.
    1. Under Client Information, enter the client ID and secret as defined src/config-provider.ts:
        1. Client Id: sampleClientId
        1. Client Secret: sampleClientSecret
1. The Authorization URL is the hosted URL of your app with 'https://{random-id}.ngrok.io/fakeauth' as the path
1. The Token URL is the hosted URL of your app with 'https://{random-id}.ngrok.io/faketoken' as the path
1. Enter any remaining necessary information you might need for authentication your app. Click Save.

### Now let's test it:

1. On a device with the Google Assistant logged into the same account used to create the project in the Actions Console, enter your Assistant settings.
1. Click Home Control.
1. Click the '+' sign to add a device.
1. Find your app in the list of providers.
1. After clicking your app, a new "Smart Switch" will show up in your device list
1. Start using the Google Assistant in the Actions Console to control your devices. Try saying 'turn the switch on'.

What's with the python file (screen.py)?  
I used it to control another process (maybe some lights via USB). The call to that is in index.ts: swState()  
Here's an interesting project you might find useful: [GPIO for a Linux PC using a $3 board](https://www.diyaudio.com/forums/pc-based/328797-adding-gpio-functionality-linux-desktop-computer.html)


This is a simplified version of Google's [official](https://github.com/actions-on-google/smart-home-nodejs) sample code.

It should take you minutes instead of hours.
