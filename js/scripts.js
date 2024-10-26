/*!
* Start Bootstrap - Modern Business v5.0.7 (https://startbootstrap.com/template-overviews/modern-business)
* Copyright 2013-2023 Start Bootstrap
* Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-modern-business/blob/master/LICENSE)
*/
// This file is intentionally blank
// Use this file to add JavaScript to your project

const translations = {
    en: {
      greeting: "Welcome!",
      about: "This is a simple website.",
      label: 'English',
      collaborations: 'Collaborations',
      aboutUs: 'About Us',
      aboutUsText: `<p>The Section Evidence-Based Medicine in Psychiatry & Psychotherapy was established at the Medical Faculty of the <b>Technical University of Munich</b> in 2019.</p><p>Under the leadership of <a href="/team/prof-stefan-leucht/">Prof. Stefan Leucht</a>, our international team is engaged in various projects in the field of evidence-based medicine in psychiatry and psychotherapy. These projects include randomized trials, registry studies, creation of smartphone apps for shared decision making, systematic reviews and meta-analyses of all kinds, up to the creation of treatment guidelines.</p><p>Thanks to our collaborative network with the best experts and institutions in the world (see <a href="/collaborations/">Collaborations</a>), we manage to produce evidence-based information according to the latest standards. In addition, we strive to improve and develop the methods of evidence-based medicine further.</p>`
    },
    de: {
      greeting: "Herzlich Willkommen!",
      about: "Este es un sitio simple.",
      label: 'Deutsch',
      collaborations: 'Kooperationen',
      aboutUs: 'Über Uns',
      aboutUsText: `<p>Die Sektion Evidence-Based Medicine in Psychiatry & Psychotherapy wurde 2019 an der Medizinischen Fakultät der <b>Technischen Universität München</b> eingerichtet.</p><p>Unter der Leitung von <a href="/team/prof-stefan-leucht/">Prof. Stefan Leucht</a> ist unser internationales Team in verschiedenen Projekten auf dem Gebiet der evidenzbasierten Medizin in Psychiatrie und Psychotherapie tätig. Diese Projekte umfassen randomisierte Studien, Registerstudien, die Entwicklung von Smartphone-Apps für gemeinsame Entscheidungsfindung, systematische Übersichtsarbeiten und Meta-Analysen aller Art bis hin zur Erstellung von Behandlungsleitlinien.</p><p>Dank unseres kollaborativen Netzwerks mit den besten Experten und Institutionen weltweit (siehe <a href="/collaborations/">Kooperationen</a>) gelingt es uns, evidenzbasierte Informationen nach den neuesten Standards zu erstellen. Darüber hinaus bemühen wir uns, die Methoden der evidenzbasierten Medizin weiter zu verbessern und weiterzuentwickeln.</p>`
    }
  };
  


// Icon switcher
function iconSwitcher(lang) {
  // Update the dropdown button with the selected language and flag
  const dropdownButton = document.getElementById('languageSwitcher');
  if (lang == 'en') {
      dropdownButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 512 512"><mask id="a"><circle cx="256" cy="256" r="256" fill="#fff"/></mask><g mask="url(#a)"><path fill="#eee" d="m0 0 8 22-8 23v23l32 54-32 54v32l32 48-32 48v32l32 54-32 54v68l22-8 23 8h23l54-32 54 32h32l48-32 48 32h32l54-32 54 32h68l-8-22 8-23v-23l-32-54 32-54v-32l-32-48 32-48v-32l-32-54 32-54V0l-22 8-23-8h-23l-54 32-54-32h-32l-48 32-48-32h-32l-54 32L68 0H0z"/><path fill="#0052b4" d="M336 0v108L444 0Zm176 68L404 176h108zM0 176h108L0 68ZM68 0l108 108V0Zm108 512V404L68 512ZM0 444l108-108H0Zm512-108H404l108 108Zm-68 176L336 404v108z"/><path fill="#d80027" d="M0 0v45l131 131h45L0 0zm208 0v208H0v96h208v208h96V304h208v-96H304V0h-96zm259 0L336 131v45L512 0h-45zM176 336 0 512h45l131-131v-45zm160 0 176 176v-45L381 336h-45z"/></g></svg>`
  } else {
      dropdownButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 512 512"><mask id="a"><circle cx="256" cy="256" r="256" fill="#fff"/></mask><g mask="url(#a)"><path fill="#ffda44" d="m0 345 256.7-25.5L512 345v167H0z"/><path fill="#d80027" d="m0 167 255-23 257 23v178H0z"/><path fill="#333" d="M0 0h512v167H0z"/></g></svg>`
  }
  sessionStorage.setItem('language', lang);
}
  
// Add event listeners to dropdown items
function switchLanguageBtn() {
  var lang = sessionStorage.getItem('language');
  if (lang==='de') {
    switchLanguage('en');
  } else {
    switchLanguage('de');
  }
}

// On page load, set the default language (English)
window.onload = function() {
  if(sessionStorage.getItem('language')===null) {
      switchLanguage('en');
  } else {
      switchLanguage(sessionStorage.getItem('language'));
  }
};
