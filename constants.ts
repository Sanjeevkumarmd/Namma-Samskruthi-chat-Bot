import { Language } from './types';

export const HERITAGE_IMAGES = [
  "https://cdn.getyourguide.com/image/format=auto,fit=contain,gravity=auto,quality=60,width=1440,height=650,dpr=2/tour_img/e87151f2dc447e0499d6f2ded5a31b9a03a8b9edcf34410c1b98d766f0f20901.jpg",
  "https://cdn.getyourguide.com/image/format=auto,fit=contain,gravity=auto,quality=60,width=1440,height=650,dpr=2/tour_img/ce61a4bf54924012de002a4f023d5b56969a6f90a78b1075d86bd729de3be130.png",
  "https://nammakpsc.com/wp-content/uploads/2021/07/Hampi.jpg",
  "https://cdn.getyourguide.com/image/format=auto,fit=contain,gravity=auto,quality=60,width=1440,height=650,dpr=2/tour_img/93ded9675e5a04920b65321bc6768c956c3880d62ed87bedf311b20f02243e6f.png",
  "https://cdn.getyourguide.com/image/format=auto,fit=contain,gravity=auto,quality=60,width=1440,height=650,dpr=2/tour_img/8ad7ccb9d47b8e95e3c2f6cf10450ae8b01d9ed7fd4b5288b1360b5e3b060f90.png"
];

export const LANGUAGE_OPTIONS = {
    'en-US': 'English',
    'hi-IN': 'हिन्दी',
    'kn-IN': 'ಕನ್ನಡ'
};

export const VISUAL_PROMPTS = [
  {
    titleKey: 'promptPalaces',
    descriptionKey: 'promptPalacesDesc',
    prompt: 'Tell me about the most famous royal palaces in Karnataka.'
  },
  {
    titleKey: 'promptWaterfalls',
    descriptionKey: 'promptWaterfallsDesc',
    prompt: 'What are the best waterfall treks in Karnataka for a weekend trip?'
  },
  {
    titleKey: 'promptChalukyan',
    descriptionKey: 'promptChalukyanDesc',
    prompt: 'Create an itinerary to explore Chalukyan architecture in Badami, Aihole, and Pattadakal.'
  },
  {
    titleKey: 'promptInscriptions',
    descriptionKey: 'promptInscriptionsDesc',
    prompt: 'What are some of the most mysterious or important inscriptions found in Karnataka?'
  },
  {
    titleKey: 'promptFoodTour',
    descriptionKey: 'promptFoodTourDesc',
    prompt: 'Plan a food tour for me focusing on coastal Karnataka cuisine.'
  },
  {
    titleKey: 'promptForts',
    descriptionKey: 'promptFortsDesc',
    prompt: 'Tell me about some lesser-known but interesting forts in Karnataka.'
  }
];
