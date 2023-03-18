import 'dotenv/config';

import dropbox from 'dropbox';
import fetch from 'node-fetch';
import moment from 'moment';
import path from 'path';

const dbx = new dropbox.Dropbox({
  clientId: process.env.DROPBOX_APP_KEY,
  clientSecret: process.env.DROPBOX_APP_SECRET,
  refreshToken: process.env.DROPBOX_REFRESH_TOKEN,
});

function getCrossword(date) {
  const d = moment(date);
  const crosswordURL = new URL(`https://s.wsj.net/public/resources/documents/${d.format('[XWD]MMDDYYYY')}.pdf`);

  console.log(`Getting crossword for ${d.format('dddd (MM/DD/YYYY)')}`);
  console.log(`Crossword URL: ${crosswordURL}`);

  fetch(crosswordURL, {
    headers: {
      Referer: 'https://www.wsj.com/news/puzzle',
    },
  }).then((res) => {
    if (res.status === 200) {
      res.arrayBuffer().then((buffer) => {
        const normalizedUploadPath = path.normalize(process.env.DROPBOX_UPLOAD_PATH);
        const fileName = `${d.format('YYYYMMDD')} - WSJ Crossword.pdf`
        const filePath = path.join(normalizedUploadPath, fileName);

        console.log(`Uploading crossword to ${filePath}`);

        dbx.filesUpload({
          path: filePath,
          contents: buffer,
        }).then((res) => {
          console.log('Successfully uploaded crossword');
          console.log(`Content hash: ${res.result.content_hash}`);
        }).catch((err) => {
          console.log('Error writing to Dropbox');
          console.log(err);
        });
      });
    } else {
      console.log('Response was unsuccessful');
      console.log(res.error);
    }
  }).catch(function (err) {
    console.log('Unable to fetch crossword');
    console.log(err);
  });
}

function run() {
  console.log('Running...');

  const today = new Date();
  const todayNY = new Date(today.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const tomorrowNY = new Date(todayNY).setDate(todayNY.getDate() + 1);

  console.log(`Time in New York: ${todayNY}`);

  const currentDay = todayNY.getDay();
  const currentHour = todayNY.getHours();

  const isSunday = currentDay === 0;

  // Is it any day other than sunday between 1:00 and 1:59pm local NY time?
  const shouldFetchDailyCrossword = !isSunday && currentHour === 1 + 12;

  // Is it Sunday and between 9:00 and 9:59pm local NY time?
  const shouldFetchSundayCrossword = isSunday && currentHour === 9 + 12;

  if (shouldFetchDailyCrossword || shouldFetchSundayCrossword) {
    getCrossword(tomorrowNY);
  } else {
    console.log('Not ready to fetch crossword yet.');
  }
}

run();
