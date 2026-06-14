/* ============================================
   NAATYA - Theatre Production Management System
   Main JavaScript
   ============================================ */

// ---------- Sidebar Toggle ----------
function initSidebar() {
  const toggleBtn = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', function () {
      sidebar.classList.toggle('show');
      if (overlay) overlay.classList.toggle('show');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', function () {
      sidebar.classList.remove('show');
      overlay.classList.remove('show');
    });
  }
}

// ---------- Security: Disable Right-Click ----------
function disableRightClick() {
  document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    showToast('Right-click is disabled for security purposes.', 'warning');
  });
}

// ---------- Security: Block Copy/Cut ----------
function blockCopyCut() {
  document.addEventListener('copy', function (e) {
    e.preventDefault();
    showToast('Copy operation is blocked.', 'warning');
  });
  document.addEventListener('cut', function (e) {
    e.preventDefault();
    showToast('Cut operation is blocked.', 'warning');
  });
}

// ---------- Security: Block Dev Tools Shortcuts ----------
function blockDevTools() {
  document.addEventListener('keydown', function (e) {
    // F12
    if (e.key === 'F12') {
      e.preventDefault();
      showToast('Developer tools access is blocked.', 'warning');
    }
    // Ctrl+Shift+I / Cmd+Option+I
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
      e.preventDefault();
      showToast('Developer tools access is blocked.', 'warning');
    }
    // Ctrl+Shift+J / Cmd+Option+J
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
      e.preventDefault();
      showToast('Developer tools access is blocked.', 'warning');
    }
    // Ctrl+Shift+C / Cmd+Option+C
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
      e.preventDefault();
      showToast('Developer tools access is blocked.', 'warning');
    }
    // Ctrl+U / Cmd+U
    if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) {
      e.preventDefault();
      showToast('View source is blocked.', 'warning');
    }
  });
}

// ---------- Security: Blur on Tab Switch ----------
function initBlurOnTabSwitch() {
  const blurOverlay = document.getElementById('blurOverlay');

  document.addEventListener('visibilitychange', function () {
    if (blurOverlay) {
      if (document.hidden) {
        blurOverlay.classList.add('active');
      } else {
        blurOverlay.classList.remove('active');
      }
    }
  });
}

// ---------- Toast Notification ----------
function showToast(message, type) {
  type = type || 'info';
  let existing = document.getElementById('naatyaToastContainer');
  if (!existing) {
    existing = document.createElement('div');
    existing.id = 'naatyaToastContainer';
    existing.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(existing);
  }

  var toast = document.createElement('div');
  var colors = {
    info: 'rgba(37,99,235,0.9)',
    warning: 'rgba(245,158,11,0.9)',
    success: 'rgba(16,185,129,0.9)',
    danger: 'rgba(239,68,68,0.9)'
  };

  toast.style.cssText = 'background:' + (colors[type] || colors.info) + ';color:#fff;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:500;box-shadow:0 4px 15px rgba(0,0,0,0.3);animation:slideDown 0.3s ease-out;max-width:360px;';
  toast.textContent = message;
  existing.appendChild(toast);

  setTimeout(function () {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = '0.3s ease-out';
    setTimeout(function () { toast.remove(); }, 300);
  }, 2500);
}

// ---------- Login Handler ----------
function initLogin() {
  var loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var username = document.getElementById('loginUsername').value.trim();
    var password = document.getElementById('loginPassword').value.trim();

    if (!username || !password) {
      showToast('Please enter both username and password.', 'warning');
      return;
    }

    // Demo login
    if (username === 'admin' && password === 'admin') {
      showToast('Login successful! Redirecting...', 'success');
      setTimeout(function () {
        window.location.href = 'dashboard.html';
      }, 1000);
    } else {
      showToast('Invalid credentials. Try admin/admin', 'danger');
    }
  });
}

// ---------- Logout Handler ----------
function initLogout() {
  var logoutBtns = document.querySelectorAll('.btn-logout');
  logoutBtns.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      showToast('Logging out...', 'info');
      setTimeout(function () {
        window.location.href = 'index.html';
      }, 800);
    });
  });
}

// ---------- Members Page ----------
function initMembersPage() {
  var addBtn = document.getElementById('btnAddMember');
  var saveBtn = document.getElementById('btnSaveMember');
  var searchInput = document.getElementById('memberSearch');

  if (!addBtn) return;

  addBtn.addEventListener('click', function () {
    document.getElementById('memberModalLabel').textContent = 'Add New Member';
    document.getElementById('memberForm').reset();
    document.getElementById('memberId').value = '';
    var modal = new bootstrap.Modal(document.getElementById('memberModal'));
    modal.show();
  });

  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      var id = document.getElementById('memberId').value;
      var name = document.getElementById('memberName').value.trim();
      var role = document.getElementById('memberRole').value.trim();
      var phone = document.getElementById('memberPhone').value.trim();
      var status = document.getElementById('memberStatus').value;

      if (!name || !role || !phone) {
        showToast('Please fill in all required fields.', 'warning');
        return;
      }

      if (id) {
        // Edit existing row
        var row = document.querySelector('tr[data-member-id="' + id + '"]');
        if (row) {
          row.cells[0].textContent = name;
          row.cells[1].textContent = role;
          row.cells[2].textContent = phone;
          var statusBadge = row.cells[3].querySelector('.badge-status');
          statusBadge.className = 'badge-status badge-' + status.toLowerCase().replace(' ', '-');
          statusBadge.textContent = status;
        }
        showToast('Member updated successfully!', 'success');
      } else {
        // Add new row
        addMemberRow(name, role, phone, status);
        showToast('Member added successfully!', 'success');
      }

      bootstrap.Modal.getInstance(document.getElementById('memberModal')).hide();
    });
  }

  // Search
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      var filter = this.value.toLowerCase();
      var rows = document.querySelectorAll('#membersTableBody tr');
      rows.forEach(function (row) {
        var text = row.textContent.toLowerCase();
        row.style.display = text.includes(filter) ? '' : 'none';
      });
    });
  }

  // Edit & Delete
  document.addEventListener('click', function (e) {
    if (e.target.closest('.btn-action-edit') && e.target.closest('#membersTableBody')) {
      var btn = e.target.closest('.btn-action-edit');
      var row = btn.closest('tr');
      var id = row.dataset.memberId;

      document.getElementById('memberModalLabel').textContent = 'Edit Member';
      document.getElementById('memberId').value = id;
      document.getElementById('memberName').value = row.cells[0].textContent;
      document.getElementById('memberRole').value = row.cells[1].textContent;
      document.getElementById('memberPhone').value = row.cells[2].textContent;

      var statusText = row.cells[3].querySelector('.badge-status').textContent.trim();
      document.getElementById('memberStatus').value = statusText;

      var modal = new bootstrap.Modal(document.getElementById('memberModal'));
      modal.show();
    }

    if (e.target.closest('.btn-action-delete') && e.target.closest('#membersTableBody')) {
      if (confirm('Are you sure you want to remove this member?')) {
        var row = e.target.closest('.btn-action-delete').closest('tr');
        row.style.opacity = '0';
        row.style.transform = 'translateX(20px)';
        row.style.transition = '0.3s ease-out';
        setTimeout(function () { row.remove(); }, 300);
        showToast('Member removed successfully!', 'success');
      }
    }
  });
}

function addMemberRow(name, role, phone, status) {
  var tbody = document.getElementById('membersTableBody');
  var id = 'M' + Date.now();
  var statusClass = status.toLowerCase().replace(' ', '-');
  var html = '<tr data-member-id="' + id + '">' +
    '<td>' + escapeHtml(name) + '</td>' +
    '<td>' + escapeHtml(role) + '</td>' +
    '<td>' + escapeHtml(phone) + '</td>' +
    '<td><span class="badge-status badge-' + statusClass + '">' + escapeHtml(status) + '</span></td>' +
    '<td>' +
    '<button class="btn-action btn-action-edit me-1" title="Edit"><i class="bi bi-pencil"></i></button>' +
    '<button class="btn-action btn-action-delete" title="Delete"><i class="bi bi-trash3"></i></button>' +
    '</td></tr>';
  tbody.insertAdjacentHTML('beforeend', html);
}

// ---------- Inventory Page ----------
function initInventoryPage() {
  var addBtn = document.getElementById('btnAddProp');
  var saveBtn = document.getElementById('btnSaveProp');
  var searchInput = document.getElementById('propSearch');

  if (!addBtn) return;

  addBtn.addEventListener('click', function () {
    document.getElementById('propModalLabel').textContent = 'Add New Prop';
    document.getElementById('propForm').reset();
    document.getElementById('propId').value = '';
    var modal = new bootstrap.Modal(document.getElementById('propModal'));
    modal.show();
  });

  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      var id = document.getElementById('propId').value;
      var name = document.getElementById('propName').value.trim();
      var quantity = document.getElementById('propQuantity').value.trim();
      var status = document.getElementById('propStatus').value;

      if (!name || !quantity) {
        showToast('Please fill in all required fields.', 'warning');
        return;
      }

      if (id) {
        var row = document.querySelector('tr[data-prop-id="' + id + '"]');
        if (row) {
          row.cells[0].textContent = name;
          row.cells[1].textContent = quantity;
          var statusBadge = row.cells[2].querySelector('.badge-status');
          statusBadge.className = 'badge-status badge-' + status.toLowerCase().replace(' ', '-');
          statusBadge.textContent = status;
        }
        showToast('Prop updated successfully!', 'success');
      } else {
        addPropRow(name, quantity, status);
        showToast('Prop added successfully!', 'success');
      }

      bootstrap.Modal.getInstance(document.getElementById('propModal')).hide();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      var filter = this.value.toLowerCase();
      var rows = document.querySelectorAll('#propsTableBody tr');
      rows.forEach(function (row) {
        var text = row.textContent.toLowerCase();
        row.style.display = text.includes(filter) ? '' : 'none';
      });
    });
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('.btn-action-edit') && e.target.closest('#propsTableBody')) {
      var btn = e.target.closest('.btn-action-edit');
      var row = btn.closest('tr');
      var id = row.dataset.propId;

      document.getElementById('propModalLabel').textContent = 'Edit Prop';
      document.getElementById('propId').value = id;
      document.getElementById('propName').value = row.cells[0].textContent;
      document.getElementById('propQuantity').value = row.cells[1].textContent;

      var statusText = row.cells[2].querySelector('.badge-status').textContent.trim();
      document.getElementById('propStatus').value = statusText;

      var modal = new bootstrap.Modal(document.getElementById('propModal'));
      modal.show();
    }

    if (e.target.closest('.btn-action-delete') && e.target.closest('#propsTableBody')) {
      if (confirm('Are you sure you want to remove this prop?')) {
        var row = e.target.closest('.btn-action-delete').closest('tr');
        row.style.opacity = '0';
        row.style.transform = 'translateX(20px)';
        row.style.transform = '0.3s ease-out';
        setTimeout(function () { row.remove(); }, 300);
        showToast('Prop removed successfully!', 'success');
      }
    }
  });
}

function addPropRow(name, quantity, status) {
  var tbody = document.getElementById('propsTableBody');
  var id = 'P' + Date.now();
  var statusClass = status.toLowerCase().replace(' ', '-');
  var html = '<tr data-prop-id="' + id + '">' +
    '<td>' + escapeHtml(name) + '</td>' +
    '<td>' + escapeHtml(quantity) + '</td>' +
    '<td><span class="badge-status badge-' + statusClass + '">' + escapeHtml(status) + '</span></td>' +
    '<td>' +
    '<button class="btn-action btn-action-edit me-1" title="Edit"><i class="bi bi-pencil"></i></button>' +
    '<button class="btn-action btn-action-delete" title="Delete"><i class="bi bi-trash3"></i></button>' +
    '</td></tr>';
  tbody.insertAdjacentHTML('beforeend', html);
}

// ---------- Rehearsals Page ----------
function initRehearsalsPage() {
  var addBtn = document.getElementById('btnAddRehearsal');
  var saveBtn = document.getElementById('btnSaveRehearsal');
  var searchInput = document.getElementById('rehearsalSearch');

  if (!addBtn) return;

  addBtn.addEventListener('click', function () {
    document.getElementById('rehearsalModalLabel').textContent = 'Schedule New Rehearsal';
    document.getElementById('rehearsalForm').reset();
    document.getElementById('rehearsalId').value = '';
    var modal = new bootstrap.Modal(document.getElementById('rehearsalModal'));
    modal.show();
  });

  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      var id = document.getElementById('rehearsalId').value;
      var title = document.getElementById('rehearsalTitle').value.trim();
      var date = document.getElementById('rehearsalDate').value;
      var time = document.getElementById('rehearsalTime').value;
      var venue = document.getElementById('rehearsalVenue').value.trim();

      if (!title || !date || !time || !venue) {
        showToast('Please fill in all required fields.', 'warning');
        return;
      }

      var formattedDate = formatDate(date);
      var formattedTime = formatTime(time);

      if (id) {
        var row = document.querySelector('tr[data-rehearsal-id="' + id + '"]');
        if (row) {
          row.cells[0].textContent = title;
          row.cells[1].textContent = formattedDate;
          row.cells[2].textContent = formattedTime;
          row.cells[3].textContent = venue;
        }
        showToast('Rehearsal updated successfully!', 'success');
      } else {
        addRehearsalRow(title, formattedDate, formattedTime, venue);
        showToast('Rehearsal scheduled successfully!', 'success');
      }

      bootstrap.Modal.getInstance(document.getElementById('rehearsalModal')).hide();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      var filter = this.value.toLowerCase();
      var rows = document.querySelectorAll('#rehearsalsTableBody tr');
      rows.forEach(function (row) {
        var text = row.textContent.toLowerCase();
        row.style.display = text.includes(filter) ? '' : 'none';
      });
    });
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('.btn-action-edit') && e.target.closest('#rehearsalsTableBody')) {
      var btn = e.target.closest('.btn-action-edit');
      var row = btn.closest('tr');
      var id = row.dataset.rehearsalId;

      document.getElementById('rehearsalModalLabel').textContent = 'Edit Rehearsal';
      document.getElementById('rehearsalId').value = id;
      document.getElementById('rehearsalTitle').value = row.cells[0].textContent;
      // For simplicity, date/time are reset; in production you'd reverse-format these
      document.getElementById('rehearsalDate').value = '';
      document.getElementById('rehearsalTime').value = '';
      document.getElementById('rehearsalVenue').value = row.cells[3].textContent;

      var modal = new bootstrap.Modal(document.getElementById('rehearsalModal'));
      modal.show();
    }

    if (e.target.closest('.btn-action-delete') && e.target.closest('#rehearsalsTableBody')) {
      if (confirm('Are you sure you want to cancel this rehearsal?')) {
        var row = e.target.closest('.btn-action-delete').closest('tr');
        row.style.opacity = '0';
        row.style.transform = 'translateX(20px)';
        row.style.transition = '0.3s ease-out';
        setTimeout(function () { row.remove(); }, 300);
        showToast('Rehearsal cancelled.', 'success');
      }
    }
  });
}

function addRehearsalRow(title, date, time, venue) {
  var tbody = document.getElementById('rehearsalsTableBody');
  var id = 'R' + Date.now();
  var html = '<tr data-rehearsal-id="' + id + '">' +
    '<td>' + escapeHtml(title) + '</td>' +
    '<td>' + escapeHtml(date) + '</td>' +
    '<td>' + escapeHtml(time) + '</td>' +
    '<td>' + escapeHtml(venue) + '</td>' +
    '<td>' +
    '<button class="btn-action btn-action-edit me-1" title="Edit"><i class="bi bi-pencil"></i></button>' +
    '<button class="btn-action btn-action-delete" title="Delete"><i class="bi bi-trash3"></i></button>' +
    '</td></tr>';
  tbody.insertAdjacentHTML('beforeend', html);
}

// ---------- Helpers ----------
function escapeHtml(text) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  var parts = dateStr.split('-');
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return parts[2] + ' ' + months[parseInt(parts[1], 10) - 1] + ' ' + parts[0];
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  var parts = timeStr.split(':');
  var h = parseInt(parts[0], 10);
  var m = parts[1];
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + m + ' ' + ampm;
}

// ---------- Initialization ----------
document.addEventListener('DOMContentLoaded', function () {
  initSidebar();
  disableRightClick();
  blockCopyCut();
  blockDevTools();
  initBlurOnTabSwitch();
  initLogin();
  initLogout();
  initMembersPage();
  initInventoryPage();
  initRehearsalsPage();
});

// ---------- Toast animation keyframes ----------
var style = document.createElement('style');
style.textContent = '@keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}';
document.head.appendChild(style);
