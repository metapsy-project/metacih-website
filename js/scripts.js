fetch('/html/navbar.html')
    .then(response => response.text())
    .then(html => {
      document.getElementById('navbar-inner').innerHTML = html;
});

fetch('/html/footer.html')
    .then(response => response.text())
    .then(html => {
      document.getElementById('footer').innerHTML = html;
});