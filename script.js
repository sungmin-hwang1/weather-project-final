// ====================== 설정 ======================
const API_KEY = "40c79555672031db459900c93146d050";

// ====================== DOM ======================
const appEl = document.getElementById("app");
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const errorMessage = document.getElementById("errorMessage");

const currentSection = document.getElementById("currentWeather");
const cityNameEl = document.getElementById("cityName");
const localTimeEl = document.getElementById("localTime");
const iconEl = document.getElementById("icon");
const tempEl = document.getElementById("temp");
const descEl = document.getElementById("description");
const feelsLikeEl = document.getElementById("feelsLike");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const outfitEl = document.getElementById("outfit");

const forecastSection = document.getElementById("forecastSection");
const forecastListEl = document.getElementById("forecastList");

const celsiusBtn = document.getElementById("celsiusBtn");
const fahrenheitBtn = document.getElementById("fahrenheitBtn");

const recentSearchesEl = document.getElementById("recentSearches");

// ====================== 상태 ======================
let lastDataMetric = null;
let lastForecastMetric = null;
let currentUnit = "metric";

// ====================== 유틸 ======================
function toFahrenheit(c) {
  return c * 9 / 5 + 32;
}

function formatTemp(v) {
  return `${Math.round(v)}${currentUnit === "metric" ? "°C" : "°F"}`;
}

function getLocalTime(dt, tz) {
  const d = new Date((dt + tz) * 1000);
  return {
    text: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`,
    hour: d.getUTCHours()
  };
}

function updateBackground(main, hour) {
  let cls = "clear";
  const m = main.toLowerCase();

  if (m.includes("cloud")) cls = "clouds";
  else if (m.includes("rain") || m.includes("drizzle")) cls = "rain";
  else if (m.includes("snow")) cls = "snow";
  else if (m.includes("thunder")) cls = "thunderstorm";

  const night = hour >= 18 || hour < 6;
  appEl.className = `app ${cls} ${night ? "night" : "day"}`;
}

function getOutfitSuggestion(t) {
  if (t <= 0) return "매우 춥습니다. 패딩 필수!";
  if (t <= 10) return "코트/자켓 추천";
  if (t <= 20) return "선선합니다. 가벼운 옷 추천";
  if (t <= 28) return "반팔도 괜찮아요";
  return "매우 덥습니다. 물 많이 마셔요!";
}

// ====================== API ======================
async function fetchCurrentWeather(city) {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric&lang=kr`
  );
  if (!res.ok) throw new Error("도시를 찾을 수 없습니다.");
  return res.json();
}

async function fetchForecast(city) {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric&lang=kr`
  );
  if (!res.ok) throw new Error("예보를 불러오지 못했습니다.");
  return res.json();
}

// ====================== 렌더링 ======================
function displayCurrentWeather(data) {
  lastDataMetric = data;

  const { text, hour } = getLocalTime(data.dt, data.timezone);
  const w = data.weather[0];

  cityNameEl.textContent = `${data.name}, ${data.sys.country}`;
  localTimeEl.textContent = `현지 시간: ${text}`;

  const temp = currentUnit === "metric" ? data.main.temp : toFahrenheit(data.main.temp);
  const feels = currentUnit === "metric" ? data.main.feels_like : toFahrenheit(data.main.feels_like);

  tempEl.textContent = formatTemp(temp);
  feelsLikeEl.textContent = formatTemp(feels);
  descEl.textContent = w.description;
  humidityEl.textContent = `${data.main.humidity}%`;
  windEl.textContent = `${data.wind.speed} m/s`;

  iconEl.src = `https://openweathermap.org/img/wn/${w.icon}@2x.png`;
  outfitEl.textContent = getOutfitSuggestion(data.main.temp);

  updateBackground(w.main, hour);

  currentSection.hidden = false;
}

function displayForecast(data) {
  lastForecastMetric = data;

  const list = data.list.filter(i => i.dt_txt.includes("12:00:00")).slice(0, 3);
  forecastListEl.innerHTML = "";

  list.forEach(item => {
    const { text } = getLocalTime(item.dt, data.city.timezone);

    const card = document.createElement("div");
    card.className = "forecast-card";

    card.innerHTML = `
      <p>${text.split(" ")[0]}</p>
      <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" />
      <p>${formatTemp(item.main.temp)}</p>
      <p>${item.weather[0].description}</p>
    `;
    forecastListEl.appendChild(card);
  });

  forecastSection.hidden = false;
}

function rerenderWithUnit() {
  if (!lastDataMetric || !lastForecastMetric) return;
  displayCurrentWeather(lastDataMetric);
  displayForecast(lastForecastMetric);
}

// ====================== 최근 검색 ======================
const RECENT_KEY = "weather_recent_cities";

function loadRecentCities() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecentCity(city) {
  const arr = loadRecentCities().filter(
    c => c.toLowerCase() !== city.toLowerCase()
  );

  arr.unshift(city);
  localStorage.setItem(RECENT_KEY, JSON.stringify(arr.slice(0, 5)));
  renderRecentSearches();
}

function renderRecentSearches() {
  recentSearchesEl.innerHTML = "";

  loadRecentCities().forEach(city => {
    const btn = document.createElement("button");
    btn.textContent = city;

    btn.addEventListener("click", () => {
      cityInput.value = city;
      handleSearch();
    });

    recentSearchesEl.appendChild(btn);
  });
}

// ====================== 검색 ======================
async function handleSearch() {
  const city = cityInput.value.trim();
  if (!city) {
    errorMessage.textContent = "도시명을 입력하세요.";
    return;
  }

  errorMessage.textContent = "";

  try {
    const [cur, fore] = await Promise.all([
      fetchCurrentWeather(city),
      fetchForecast(city)
    ]);

    displayCurrentWeather(cur);
    displayForecast(fore);
    saveRecentCity(city);
  } catch (err) {
    errorMessage.textContent = err.message;
  }
}

// ====================== 이벤트 ======================
searchBtn.addEventListener("click", handleSearch);
cityInput.addEventListener("keydown", e => {
  if (e.key === "Enter") handleSearch();
});

celsiusBtn.addEventListener("click", () => {
  currentUnit = "metric";
  rerenderWithUnit();
});

fahrenheitBtn.addEventListener("click", () => {
  currentUnit = "imperial";
  rerenderWithUnit();
});

// ====================== 초기 실행 ======================
renderRecentSearches();
