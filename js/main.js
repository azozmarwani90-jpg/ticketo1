
updateProfile(up){ if (!this.currentUser) return false; const db=DB.getDatabase(); const i=db.users.findIndex(u=>u.id===this.currentUser.id); if (i!==-1){ db.users[i]={...db.users[i], ...up}; DB.saveDatabase(db); this.setCurrentUser(db.users[i]); return true; } return false; }
