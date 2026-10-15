// ==========================================
// 1. CONFIGURATION & STATE
// ==========================================

// DOM Elements
const dashboard = document.querySelector("#dashboard");
const searchForm = document.querySelector("#searchForm");
const cityInput = document.querySelector("#cityInput");
const searchStatus = document.querySelector("#searchStatus");

// ==========================================
// 2. WEATHER FORECAST LOGIC (OPEN-METEO API)
// ==========================================

const weatherCodes = {
  0: ["Clear sky", "☀️"],
  1: ["Mainly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Foggy", "🌫️"],
  48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Heavy drizzle", "🌧️"],
  61: ["Light rain", "🌦️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy rain", "🌩️"],
  71: ["Light snow", "🌨️"],
  73: ["Snow", "❄️"],
  75: ["Heavy snow", "❄️"],
  80: ["Rain showers", "🌦️"],
  81: ["Rain showers", "🌧️"],
  82: ["Heavy showers", "🌧️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Storm with hail", "⛈️"],
  99: ["Storm with hail", "⛈️"],
};

function getWeatherInfo(code) {
  return weatherCodes[code] || ["Unknown conditions", "❓"];
}

function renderWeatherIcon(icon, label) {
  return `<span class="weather-icon-image" aria-label="${label}" role="img">${icon}</span>`;
}

function formatHour(value) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric" });
}

function formatDay(value, index) {
  return index === 0
    ? "Today"
    : new Date(value).toLocaleDateString([], { weekday: "short" });
}

function round(value) {
  return Math.round(value);
}

async function findCity(query) {
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`,
  );

  if (!response.ok) {
    throw new Error("Could not search for that city.");
  }

  const data = await response.json();
  if (!data.results?.length) {
    throw new Error("City not found. Try a larger nearby city.");
  }

  return data.results[0];
}

async function loadWeather(place) {
  searchStatus.textContent = `Loading forecast for ${place.name}...`;

  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: "auto",
    forecast_days: 7,
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m",
    hourly: "temperature_2m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params}`,
  );
  if (!response.ok) {
    throw new Error("Weather service is unavailable right now.");
  }

  const data = await response.json();
  renderWeather(place, data);
  searchStatus.textContent = `Updated just now · ${data.timezone}`;
}

function renderWeather(place, data) {
  const currentInfo = getWeatherInfo(data.current.weather_code);
  const startHour = data.hourly.time.findIndex(
    (time) => time >= data.current.time,
  );

  const hourly = data.hourly.time
    .slice(startHour, startHour + 8)
    .map((time, index) => {
      const hourIndex = startHour + index;
      const info = getWeatherInfo(data.hourly.weather_code[hourIndex]);
      const label = index === 0 ? "Now" : formatHour(time);

      return `
        <div class="hour">
          <span class="hour-time">${label}</span>
          <span class="hour-icon">${renderWeatherIcon(info[1], info[0])}</span>
          <span class="hour-temp">${round(data.hourly.temperature_2m[hourIndex])}°</span>
        </div>
      `;
    })
    .join("");

  const daily = data.daily.time
    .map((time, index) => {
      const info = getWeatherInfo(data.daily.weather_code[index]);

      return `
        <div class="day">
          <span class="day-name">${formatDay(time, index)}</span>
          <span class="day-icon">${renderWeatherIcon(info[1], info[0])}</span>
          <span class="day-temp">
            <strong>${round(data.daily.temperature_2m_max[index])}°</strong>
            <span>${round(data.daily.temperature_2m_min[index])}°</span>
          </span>
        </div>
      `;
    })
    .join("");

  dashboard.innerHTML = `
    <div class="weather-grid">
      <article class="card current-card">
        <p class="place">${place.name}${place.country_code ? `, ${place.country_code}` : ""}</p>
        <div class="current-line">
          <div>
            <div class="temperature">${round(data.current.temperature_2m)}°</div>
            <p class="condition">${currentInfo[0]}</p>
          </div>
          <span class="weather-icon">${renderWeatherIcon(currentInfo[1], currentInfo[0])}</span>
        </div>
        <p class="high-low">
          Today
          <strong>${round(data.daily.temperature_2m_max[0])}°</strong> high ·
          <strong>${round(data.daily.temperature_2m_min[0])}°</strong> low
        </p>
      </article>

      <div class="stats">
        <div class="stat">
          <span class="stat-label">Feels like</span>
          <span class="stat-value">${round(data.current.apparent_temperature)}°</span>
        </div>
        <div class="stat">
          <span class="stat-label">Humidity</span>
          <span class="stat-value">${data.current.relative_humidity_2m}%</span>
        </div>
        <div class="stat">
          <span class="stat-label">Wind</span>
          <span class="stat-value">${round(data.current.wind_speed_10m)} <small>km/h</small></span>
        </div>
        <div class="stat">
          <span class="stat-label">Daylight</span>
          <span class="stat-value">${data.current.is_day ? "Day" : "Night"}</span>
        </div>
      </div>

      <article class="card forecast-card">
        <div class="card-heading">
          <h2>Next hours</h2>
          <p>${data.timezone}</p>
        </div>
        <div class="hourly-list">${hourly}</div>
      </article>

      <article class="card forecast-card">
        <div class="card-heading">
          <h2>7-day outlook</h2>
          <p>High / low</p>
        </div>
        <div class="daily-list">${daily}</div>
      </article>
    </div>
  `;
}

async function searchWeather(query) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return;

  searchStatus.textContent = "Finding that place...";

  try {
    const place = await findCity(cleanQuery);
    await loadWeather(place);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong.";
    dashboard.innerHTML = `<div class="error">${message}</div>`;
    searchStatus.textContent = "Try searching again.";
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchWeather(cityInput.value);
});

// ==========================================
// 3. BOOTSTRAP
// ==========================================

window.addEventListener("DOMContentLoaded", () => {
  searchWeather("New Delhi");
});
