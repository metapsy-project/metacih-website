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
      label: "English",
      collaborations: "Collaborations",
      aboutUs: "About Us",
      aboutUsText: "<p>The Section Evidence-Based Medicine in Psychiatry & Psychotherapy was established at the Medical Faculty of the <b>Technical University of Munich</b> in 2019.</p><p>Under the leadership of <a href=\"/team/prof-stefan-leucht/\">Prof. Stefan Leucht</a>, our international team is engaged in various projects in the field of evidence-based medicine in psychiatry and psychotherapy. These projects include randomized trials, registry studies, creation of smartphone apps for shared decision making, systematic reviews and meta-analyses of all kinds, up to the creation of treatment guidelines.</p><p>Thanks to our collaborative network with the best experts and institutions in the world (see <a href=\"/collaborations/\">Collaborations</a>), we manage to produce evidence-based information according to the latest standards. In addition, we strive to improve and develop the methods of evidence-based medicine further.</p>",
      publicationsTitle: "Publications",
      recentPublications: "Recent Publications <sup><a href=\"https://orcid.org/0000-0002-4934-4352\" target=\"_blank\"><i class=\"fa-brands blue fa-orcid\"></i></a></sup>",
      publicationInformation: "<h3>Information</h3><p>The EBMPP section has a very strong track record of publishing high-impact research articles in all major scientific journals of the field (e.g., <i>Lancet</i>, <i>JAMA Psychiatry</i>, <i>Schizophrenia Bulletin</i>).</p><p>Our section director Stefan Leucht repeatedly ranks among the <a href=\"https://archive.fo/Qrbgo\" target=\"_blank\">most highly cited researchers</a> in the world.</p><ul><li><a href=\"https://pubmed.ncbi.nlm.nih.gov/?term=leucht+s&sort=date\" target=\"_blank\">PubMed&#8599;</a></li><li><a href=\"https://scholar.google.de/scholar?hl=de&as_sdt=0%2C5&q=Stefan+Leucht&btnG\" target=\"_blank\">Google Scholar&#8599;</a></li><li><a href=\"https://www.webofscience.com/wos/author/rid/Y-2408-2019\" target=\"_blank\">Web of Science&#8599;</a></li><li><a href=\"https://www.researchgate.net/search.Search.html?type=publication&query=Stefan%20Leucht\" target=\"_blank\">ResearchGate&#8599;</a></li></ul>",
      bastaSubtitle: "The Alliance for People with Mental Illnesses",
      bastaText: "<p>BASTA is an <b>anti-stigma campaign</b> with the aim of working against discrimination and stigmatisation of people with mental illness.</p><p>BASTA has been organising <b>nationwide awareness-raising seminars</b> for pupils and police officers, cultural events and through press work since 2001.</p><p>BASTA is trialogically staffed, i.e. affected persons, relatives and psychiatry professionals work together.</p><p>The office is located in Munich at the Department of Psychiatry and Psychotherapy of the Technical University of Munich.</p><p>Further information can be found on the (German) <a href=\"https://www.bastagegenstigma.de/\" target=\"_blank\">BASTA Website&#8599;</a>.</p>",
      director: "Director",
      indexSubtitle: "This is the homepage of the Section for Evidence-Based Medicine<br> in Psychiatry and Psychotherapy (EBMPP).",
      aboutUsBtn: "About Us",
      directorBtn: "Prof. Stefan Leucht, MD",
      cochraneText: `<p>Cochrane is an international network and not-for-profit organisation that promotes the creation and the use of high-quality information to enhance healthcare knowledge and decision-making.</p><p>Dr. Irene Bighelli and Dr. Hui Wu from our team are Deputy Co-ordinating Editor and Managing Editor of the group. Together with Professor Mahesh Jayaram from the University of Melbourne, Co-ordinating Editor, they form the editorial base of Cochrane Schizophrenia.</p><p>Professor Stefan Leucht has been Editor of Cochrane Schizophrenia since the foundation of the group.</p><p>As Cochrane Schizophrenia, we coordinate and assist teams of authors from all over the world in creating methodologically sound systematic reviews on highly relevant topics for the treatment of schizophrenia, including pharmacological, psychological, and other non-pharmacological interventions.</p><p><a href="https://schizophrenia.cochrane.org" target="_blank">Cochrane Schizophrenia Website</a></p><p><a href="https://www.cochranelibrary.com" target="_blank">Cochrane Reviews can be found in Cochrane Library</a></p>`,
      imprint: "Imprint",
      imprintText: `<p style="font-size: 22px !important;" class="mb-0">Clinic and Polyclinic for Psychiatry and Psychotherapy</p><p style="font-size: 22px !important;" class="mb-0">Klinikum rechts der Isar of the Technical University of Munich</p><p style="font-size: 22px !important;" class="mb-0">Ismaninger Strasse 22</p><p style="font-size: 22px !important;" class="mb-0">81675 Munich</p><p style="font-size: 22px !important;" class="mb-0">Tel. 089 4140 - 0</p><p style="font-size: 22px !important;">Internet: ebmpp.org</p><p style="font-size: 22px !important;"><strong>Authorized representative</strong>: Prof. Dr. Stefan Leucht</p><p style="font-size: 22px !important;"><strong>VAT number</strong>: DE 129523996</p><p style="font-size: 22px !important;">Klinikum rechts der Isar is a public institution.</p><p style="font-size: 22px !important;"><strong>Professional details</strong>: Bavarian State Medical Association, Mühlbaurstraße 16, 81377 Munich (<a href="http://www.blaek.de" target="_blank" rel="noreferrer">www.blaek.de</a>).</p><p style="font-size: 22px !important;"><strong>Media law responsible person</strong>: Prof. Dr. Stefan Leucht</p><p style="font-size: 22px !important;" class="mb-0"><strong>Clinic Management</strong>: Dr. Martin Siess, Medical Director (Chair); Deputy: Prof. Dr. Tilo Biedermann</p><p style="font-size: 22px !important;" class="mb-0">Tel. 089 4140 - 7701</p><p style="font-size: 22px !important;">Fax 089 4140 - 7709</p><p style="font-size: 22px !important;"><strong>Supervisory Board Chair</strong>: Bernd Sibler, Bavarian State Minister for Science and the Arts</p><p style="font-size: 22px !important;"><strong>Supervisory Authority</strong>: Bavarian State Ministry for Science and the Arts, Salvatorstraße 2, 80333 Munich</p><p style="font-size: 22px !important;"><strong>Contact for Medical Device Safety</strong>: <a href="mailto:beauftragter.mpsicherheit@mri.tum.de">Email</a></p><p style="font-size: 22px !important;"><strong>Data Protection</strong>: See <a href="https://www.mri.tum.de/datenschutz" target="_blank" rel="noreferrer">Privacy Policy</a></p><p style="font-size: 22px !important;"><strong>Writing Style</strong>: For readability, we use the masculine form, including female members.</p>`,
      collaborationText: `<p>EBMPP is well-connected with multiple German psychiatric departments and it is part of the <a href="https://www.dzpg.org/en/">German Center for Mental Health</a>, in which <a href="/team/prof-stefan-leucht">Prof. Leucht</a> serves as a principal investigator and network co-leader. There are also links to the German Cochrane Center and the German Network for Evidence-Based Medicine.</p><p>The map below shows our <b>most important international collaborations</b>. We emphasize that without the collaboration of the teams around Prof. Georgia Salanti, Bern, Prof. Andrea Cipriani, Oxford, and Prof. Toshi Furukawa, Kyoto, many projects would not be possible.</p><br>`,
      workWithUsTitle: `Work With Us`,
      workWithUsText: `Positions for national and international researchers in our section.`,
      helpfulToolsTitle: `Helpful Tools`,
      helpfulToolsText: `Applications and other helpful tools developed by our team.`,
      linksMaterialsTitle: `Links & Materials`,
      linksMaterialsText: `Relevant links and documents for mental health professionals.`,
      publicationsTitle: `Publications`,
      publicationsText: `Peer-reviewed articles and other publications by our section.`,
      bastaText2: `The alliance for people with mental illnesses.`,
      networkTitle: `Network`,
      networkText: `International collaborations and<br> research cooperations.`
    },
    de: {
      greeting: "Herzlich Willkommen!",
      about: "Este es un sitio simple.",
      label: "Deutsch",
      collaborations: "Kooperationen",
      aboutUs: "Über Uns",
      aboutUsText: "<p>Die Sektion Evidence-Based Medicine in Psychiatry & Psychotherapy wurde 2019 an der Medizinischen Fakultät der <b>Technischen Universität München</b> eingerichtet.</p><p>Unter der Leitung von <a href=\"/team/prof-stefan-leucht/\">Prof. Stefan Leucht</a> ist unser internationales Team in verschiedenen Projekten auf dem Gebiet der evidenzbasierten Medizin in Psychiatrie und Psychotherapie tätig. Diese Projekte umfassen randomisierte Studien, Registerstudien, die Entwicklung von Smartphone-Apps für gemeinsame Entscheidungsfindung, systematische Übersichtsarbeiten und Meta-Analysen aller Art bis hin zur Erstellung von Behandlungsleitlinien.</p><p>Dank unseres kollaborativen Netzwerks mit den besten Experten und Institutionen weltweit (siehe <a href=\"/collaborations/\">Kooperationen</a>) gelingt es uns, evidenzbasierte Informationen nach den neuesten Standards zu erstellen. Darüber hinaus bemühen wir uns, die Methoden der evidenzbasierten Medizin weiter zu verbessern und weiterzuentwickeln.</p>",
      publicationsTitle: "Publikationen",
      recentPublications: "Kürzlich Publiziert <sup><a href=\"https://orcid.org/0000-0002-4934-4352\" target=\"_blank\"><i class=\"fa-brands blue fa-orcid\"></i></a></sup>",
      publicationInformation: "<h3>Information</h3><p>Die EBMPP-Abteilung hat eine sehr starke Erfolgsbilanz bei der Veröffentlichung von Forschungsergebnissen in allen bedeutenden wissenschaftlichen Zeitschriften des Fachgebiets (z. B. <i>Lancet</i>, <i>JAMA Psychiatry</i>, <i>Schizophrenia Bulletin</i>).</p><p>Unser Abteilungsleiter Stefan Leucht gehört wiederholt zu den <a href=\"https://archive.fo/Qrbgo\" target=\"_blank\">weltweit meistzitierten Forschern</a>.</p><ul><li><a href=\"https://pubmed.ncbi.nlm.nih.gov/?term=leucht+s&sort=date\" target=\"_blank\">PubMed&#8599;</a></li><li><a href=\"https://scholar.google.de/scholar?hl=de&as_sdt=0%2C5&q=Stefan+Leucht&btnG\" target=\"_blank\">Google Scholar&#8599;</a></li><li><a href=\"https://www.webofscience.com/wos/author/rid/Y-2408-2019\" target=\"_blank\">Web of Science&#8599;</a></li><li><a href=\"https://www.researchgate.net/search.Search.html?type=publication&query=Stefan%20Leucht\" target=\"_blank\">ResearchGate&#8599;</a></li></ul>",
      bastaSubtitle: "Die Allianz für Menschen mit psychischen Erkrankungen",
      bastaText: "<p>BASTA ist eine <b>Anti-Stigma-Kampagne</b> mit dem Ziel, Diskriminierung und Stigmatisierung von Menschen mit psychischen Erkrankungen entgegenzuwirken.</p><p>BASTA organisiert seit 2001 <b>bundesweite Aufklärungsseminare</b> für Schüler und Polizeibeamte, kulturelle Veranstaltungen und leistet Öffentlichkeitsarbeit.</p><p>BASTA ist trialogisch besetzt, d.h. Betroffene, Angehörige und Fachkräfte der Psychiatrie arbeiten gemeinsam.</p><p>Das Büro befindet sich in München am Lehrstuhl für Psychiatrie und Psychotherapie der Technischen Universität München.</p><p>Weitere Informationen finden Sie auf der <a href=\"https://www.bastagegenstigma.de/\" target=\"_blank\">BASTA-Website&#8599;</a>.</p>",
      director: "Leitung",
      indexSubtitle: "Dies ist die Website der Sektion Evidence-Based Medicine<br> in Psychiatry and Psychotherapy (EBMPP).",
      aboutUsBtn: "Über Uns",
      directorBtn: "Prof. Dr. med. Stefan Leucht",
      cochraneText: `<p>Cochrane ist ein internationales Netzwerk und eine gemeinnützige Organisation, die die Erstellung und Nutzung von hochwertigen Informationen zur Verbesserung des Wissens und der Entscheidungsfindung im Gesundheitswesen fördert.</p><p>Dr. Irene Bighelli und Dr. Hui Wu aus unserem Team sind stellvertretende Koordinationsredakteurin und Managing Editor der Gruppe. Gemeinsam mit Professor Mahesh Jayaram von der Universität Melbourne, Koordinationsredakteur, bilden sie die redaktionelle Basis von Cochrane Schizophrenia.</p><p>Professor Stefan Leucht ist seit der Gründung der Gruppe Herausgeber von Cochrane Schizophrenia.</p><p>Als Cochrane Schizophrenia koordinieren und unterstützen wir Autorenteams aus der ganzen Welt bei der Erstellung methodisch fundierter systematischer Übersichten zu hochrelevanten Themen für die Behandlung von Schizophrenie, einschließlich pharmakologischer, psychologischer und anderer nicht-pharmakologischer Interventionen.</p><p><a href="https://schizophrenia.cochrane.org" target="_blank">Cochrane Schizophrenia Website</a></p><p><a href="https://www.cochranelibrary.com" target="_blank">Cochrane Reviews sind in der Cochrane Library zu finden</a></p>`,
      imprint: "Impressum",
      imprintText: `<p style="font-size: 22px !important;" class="mb-0">Klinik und Poliklinik für Psychiatrie und Psychotherapie</p><p style="font-size: 22px !important;" class="mb-0">Klinikum rechts der Isar der Technischen Universität München</p><p style="font-size: 22px !important;" class="mb-0">Ismaninger Straße 22</p><p style="font-size: 22px !important;" class="mb-0">81675 München</p><p style="font-size: 22px !important;" class="mb-0">Tel. 089 4140 - 0</p><p style="font-size: 22px !important;">Internet: ebmpp.org</p><p style="font-size: 22px !important;"><strong>Vertretungsberechtigte Person</strong>: Prof. Dr. Stefan Leucht</p><p style="font-size: 22px !important;"><strong>VAT number</strong>: DE 129523996</p><p style="font-size: 22px !important;">Das Klinikum rechts der Isar ist eine Anstalt des öffentlichen Rechts.</p><p style="font-size: 22px !important;"><strong>Berufsspezifische Angaben</strong>: Bayerische Landesärztekammer, Mühlbaurstraße 16, 81377 München (<a href="http://www.blaek.de" target="_blank" rel="noreferrer">www.blaek.de</a>).</p><p style="font-size: 22px !important;"><strong>Verantwortlich im Sinne des Medienrechts</strong>: Prof. Dr. Stefan Leucht</p><p style="font-size: 22px !important;" class="mb-0"><strong>Klinikumsvorstand</strong>: Dr. Martin Siess, Ärztlicher Direktor (Vorsitz); Stellvertreter: Prof. Dr. Tilo Biedermann</p><p style="font-size: 22px !important;" class="mb-0">Tel. 089 4140 - 7701</p><p style="font-size: 22px !important;">Fax 089 4140 - 7709</p><p style="font-size: 22px !important;"><strong>Aufsichtsratsvorsitzender</strong>: Bernd Sibler, Bayerischer Staatsminister für Wissenschaft und Kunst</p><p style="font-size: 22px !important;"><strong>Aufsichtsbehörde</strong>: Bayerisches Staatsministerium für Wissenschaft und Kunst, Salvatorstraße 2, 80333 München</p><p style="font-size: 22px !important;"><strong>Kontakt für Medizinproduktesicherheit</strong>: <a href="mailto:beauftragter.mpsicherheit@mri.tum.de">E-Mail</a></p><p style="font-size: 22px !important;"><strong>Datenschutz</strong>: Siehe <a href="https://www.mri.tum.de/datenschutz" target="_blank" rel="noreferrer">Datenschutzerklärung</a></p><p style="font-size: 22px !important;"><strong>Schreibweise</strong>: Zur besseren Lesbarkeit verwenden wir die männliche Form; weibliche Mitglieder sind eingeschlossen.</p>`,
      collaborationText: `<p>EBMPP ist gut vernetzt mit mehreren deutschen psychiatrischen Abteilungen und ist Teil des <a href="https://www.dzpg.org/en/">Deutschen Zentrums für Psychische Gesundheit</a>, in dem <a href="/team/prof-stefan-leucht">Prof. Leucht</a> als Hauptforscher und Netzwerkleiter fungiert. Es bestehen auch Verbindungen zum Deutschen Cochrane Zentrum und zum Deutschen Netzwerk für Evidenzbasierte Medizin.</p><p>Die Karte unten zeigt unsere <b>wichtigsten internationalen Kooperationen</b>. Ohne die Zusammenarbeit der Teams um Prof. Georgia Salanti, Bern, Prof. Andrea Cipriani, Oxford, und Prof. Toshi Furukawa, Kyoto, wären viele Projekte nicht möglich.</p><br>`,
      workWithUsTitle: `Work With Us`,
      workWithUsText: `Stellen für nationale und internationale Forscher in unserer Sektion.`,
      helpfulToolsTitle: `Hilfreiche Tools`,
      helpfulToolsText: `Apps und andere Werkzeuge, entwickelt von unserem Team.`,
      linksMaterialsTitle: `Links & Materialien`,
      linksMaterialsText: `Relevante Links and Dokumente für Fachkräfte für psychische Gesundheit.`,
      publicationsTitle: `Veröffentlichungen`,
      publicationsText: `Beiträge in Fachzeitschriften und<br> andere Veröffentlichungen.`,
      bastaText2: `Die Allianz für Menschen mit<br> psychischen Erkrankungen.`,
      networkTitle: `Vernetzung`,
      networkText: `Internationale Kooperationen und Forschungszusammenarbeit.`
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
    switchNavbarLanguageEn();
    switchLanguage('en');
  } else {
    switchNavbarLanguageDe();
    switchLanguage('de');
  }
}

// On page load, set the default language (English)
window.onload = function() {
  if(sessionStorage.getItem('language')===null) {
      switchNavbarLanguageEn();
      switchLanguage('en');
  } else {
      if (sessionStorage.getItem('language')==='en') {
        switchNavbarLanguageEn();
      } else {
        switchNavbarLanguageDe();
      }
      switchLanguage(sessionStorage.getItem('language'));
  }
};

// Switch navbar language
switchNavbarLanguageEn = function() {
  document.getElementById("navbar-about-us").firstChild.innerHTML = 'About Us';
  document.getElementById("navbar-projects").firstChild.innerHTML = 'Projects';
  document.getElementById("navbar-collaborations").firstChild.innerHTML = 'Collaborations';
}
switchNavbarLanguageDe = function() {
  document.getElementById("navbar-about-us").firstChild.innerHTML = 'Über Uns';
  document.getElementById("navbar-projects").firstChild.innerHTML = 'Projekte';
  document.getElementById("navbar-collaborations").firstChild.innerHTML = 'Kooperationen';
}


