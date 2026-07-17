if (!Auth.isAuthenticated()) {
  window.location.href = 'login.html';
}

const user = Auth.getUser();
document.getElementById('userName').textContent = user.name;