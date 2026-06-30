const templates = {
  "Extreme heat": {
    heading: "Make the afternoon safer",
    summary: "A hot day can become dangerous before it feels dramatic. Keep the plan small: cool room, water nearby, and one check-in.",
    actions: [
      "Move the hardest tasks before 10 a.m. or after sunset.",
      "Put water, phone, medicine, and charger in the coolest room.",
      "Check one older neighbor or relative before noon."
    ],
    care: "Ask: Is the room cool? Is water nearby? Can you call me if you feel unwell?"
  },
  "Wildfire smoke": {
    heading: "Keep smoke outside",
    summary: "Smoke risk is easier to handle when the indoor plan is ready before the air looks bad.",
    actions: [
      "Close windows before the smoke smell arrives.",
      "Choose one cleaner-air room and avoid heavy outdoor activity.",
      "Share the card with anyone who has breathing difficulty or limited mobility."
    ],
    care: "Ask: Are the windows closed? Do you have a mask if you must go out?"
  },
  "Heavy rain": {
    heading: "Prevent a risky trip",
    summary: "Heavy rain turns ordinary stairs, roads, and errands into higher-risk moments for older adults.",
    actions: [
      "Move non-urgent errands to another day.",
      "Keep shoes, flashlight, phone, and important numbers together.",
      "Check if a caregiver or neighbor can help with food or medicine pickup."
    ],
    care: "Ask: Do you need anything before the rain starts? Is your phone charged?"
  },
  "Power outage during heat": {
    heading: "Prepare a no-power cooling plan",
    summary: "When heat and power outages happen together, the safest plan is the one made before the lights go off.",
    actions: [
      "Charge phone and power bank before peak heat.",
      "Identify one cooler public place or trusted contact.",
      "Prepare water and a simple check-in time."
    ],
    care: "Ask: If power fails, where will you go and who will you call?"
  }
};

const liveEndpoints = {
  geocode: "https://geocoding-api.open-meteo.com/v1/search",
  weather: "https://api.open-meteo.com/v1/forecast",
  air: "https://air-quality-api.open-meteo.com/v1/air-quality"
};

const assets = [
  ["Large-type heat card", "A printable and shareable card for older adults living alone."],
  ["Caregiver message", "A short WeChat/SMS-style text family members can send before climate risk peaks."],
  ["Volunteer checklist", "A non-medical check-in script for community volunteers."],
  ["Plain-language alert rewrite", "A template that turns government alert language into immediate actions."]
];

const budget = [
  ["One-year public hosting launch bundle, domain, backups, and uptime checks", 220],
  ["Weather, geocoding, translation, and text simplification API credits for launch testing", 260],
  ["Accessibility tools and screen-reader/low-vision validation", 210],
  ["Security, privacy, and abuse-prevention services for a public no-login tool", 160],
  ["Open template documentation, bilingual release materials, and launch contingency", 150]
];

function $(selector) {
  return document.querySelector(selector);
}

function renderCard() {
  const risk = $("#risk-type").value;
  const audience = $("#audience").value;
  const location = $("#location").value.trim() || "Online public pilot";
  const alert = $("#alert-text").value.trim();
  const template = templates[risk];

  $("#risk-pill").textContent = risk;
  $("#card-location").textContent = location;
  $("#card-heading").textContent = template.heading;
  $("#card-summary").textContent = $("#plain-language").checked
    ? template.summary
    : `${risk} notice for ${audience}. ${alert}`;

  const list = $("#action-list");
  list.innerHTML = "";
  template.actions.forEach((action, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}. ${action}`;
    list.appendChild(li);
  });

  $("#care-copy").textContent = $("#care-check").checked
    ? template.care
    : "Share this card with someone who needs a simpler climate-risk plan.";

  document.body.classList.toggle("large-mode", $("#large-type").checked);
}

function setStatus(message) {
  $("#live-status").textContent = message;
}

function chooseRiskFromWeather(weather, air) {
  const current = weather.current || {};
  const airCurrent = air?.current || {};
  const temp = Number(current.temperature_2m);
  const apparent = Number(current.apparent_temperature);
  const precip = Number(current.precipitation || 0);
  const pm25 = Number(airCurrent.pm2_5 || 0);

  if (pm25 >= 35) return "Wildfire smoke";
  if (precip >= 8) return "Heavy rain";
  if (apparent >= 33 || temp >= 33) return "Extreme heat";
  return "Extreme heat";
}

function buildAlertText(place, weather, air) {
  const current = weather.current || {};
  const units = weather.current_units || {};
  const airCurrent = air?.current || {};
  const temp = Math.round(Number(current.temperature_2m));
  const apparent = Math.round(Number(current.apparent_temperature));
  const humidity = Math.round(Number(current.relative_humidity_2m));
  const precip = Number(current.precipitation || 0).toFixed(1);
  const pm25 = airCurrent.pm2_5 == null ? null : Math.round(Number(airCurrent.pm2_5));
  const parts = [
    `${place}: current temperature is ${temp}${units.temperature_2m || "C"} and feels like ${apparent}${units.apparent_temperature || "C"}.`,
    `Humidity is ${humidity}${units.relative_humidity_2m || "%"}; current precipitation is ${precip}${units.precipitation || "mm"}.`
  ];
  if (pm25 !== null) {
    parts.push(`PM2.5 is about ${pm25} ${air.current_units?.pm2_5 || "ug/m3"}.`);
  }
  parts.push("Create a plain-language card for older adults and caregivers.");
  return parts.join(" ");
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

async function loadLiveForCoordinates(latitude, longitude, label) {
  setStatus(`Fetching current public weather for ${label}...`);
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation",
    timezone: "auto"
  });
  const airParams = new URLSearchParams({
    latitude,
    longitude,
    current: "pm2_5",
    timezone: "auto"
  });

  const [weather, air] = await Promise.all([
    fetchJson(`${liveEndpoints.weather}?${params.toString()}`),
    fetchJson(`${liveEndpoints.air}?${airParams.toString()}`).catch(() => null)
  ]);

  const risk = chooseRiskFromWeather(weather, air);
  $("#risk-type").value = risk;
  $("#location").value = label;
  $("#alert-text").value = buildAlertText(label, weather, air);
  $("#data-note").textContent = `Generated from Open-Meteo public current weather data for ${label}. The card stores no personal data.`;
  setStatus(`Loaded live public data for ${label}. Risk mode: ${risk}.`);
  renderCard();
}

async function useCityData() {
  const city = $("#city-search").value.trim();
  if (!city) {
    setStatus("Type a city first.");
    return;
  }
  try {
    setStatus(`Finding ${city}...`);
    const params = new URLSearchParams({ name: city, count: "1", language: "en", format: "json" });
    const data = await fetchJson(`${liveEndpoints.geocode}?${params.toString()}`);
    const place = data.results?.[0];
    if (!place) {
      setStatus(`No public geocoding match found for ${city}.`);
      return;
    }
    const label = [place.name, place.admin1, place.country].filter(Boolean).join(", ");
    await loadLiveForCoordinates(String(place.latitude), String(place.longitude), label);
  } catch (error) {
    setStatus(`Live data failed: ${error.message}. You can still paste an alert manually.`);
  }
}

async function useBrowserLocation() {
  if (!navigator.geolocation) {
    setStatus("Browser location is not available. Use city search instead.");
    return;
  }
  setStatus("Waiting for browser location permission...");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      loadLiveForCoordinates(String(latitude), String(longitude), "Current location").catch((error) => {
        setStatus(`Live data failed: ${error.message}. Use city search instead.`);
      });
    },
    () => setStatus("Location permission was not granted. Use city search instead."),
    { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 }
  );
}

function renderAssets() {
  const host = $("#asset-list");
  host.innerHTML = "";
  assets.forEach(([title, copy]) => {
    const item = document.createElement("article");
    item.className = "asset-item";
    item.innerHTML = `<strong>${title}</strong><p>${copy}</p>`;
    host.appendChild(item);
  });
}

function renderBudget() {
  const host = $("#budget");
  host.innerHTML = "";
  budget.forEach(([label, amount]) => {
    const item = document.createElement("div");
    item.className = "budget-item";
    item.innerHTML = `
      <div class="budget-label"><strong>${label}</strong><span>$${amount}</span></div>
      <div class="budget-track"><span class="budget-fill" style="width:${amount / 10}%"></span></div>
    `;
    host.appendChild(item);
  });
}

function activateTabs() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("is-active"));
      document.querySelectorAll(".view").forEach((view) => view.classList.remove("is-active"));
      button.classList.add("is-active");
      $(`#view-${button.dataset.view}`).classList.add("is-active");
    });
  });
}

function copyCardText() {
  const actions = [...document.querySelectorAll("#action-list li")].map((item) => item.textContent).join("\n");
  const text = `${$("#card-heading").textContent}\n${$("#card-location").textContent}\n\n${$("#card-summary").textContent}\n\n${actions}\n\nCare check: ${$("#care-copy").textContent}`;
  navigator.clipboard?.writeText(text);
  $("#copy-card").textContent = "Copied";
  setTimeout(() => {
    $("#copy-card").textContent = "Copy Text";
  }, 1300);
}

$("#card-form").addEventListener("submit", (event) => {
  event.preventDefault();
  renderCard();
});

["#risk-type", "#audience", "#location", "#alert-text", "#large-type", "#plain-language", "#care-check"].forEach((selector) => {
  $(selector).addEventListener("input", renderCard);
  $(selector).addEventListener("change", renderCard);
});

$("#copy-card").addEventListener("click", copyCardText);
$("#use-city").addEventListener("click", useCityData);
$("#use-location").addEventListener("click", useBrowserLocation);

activateTabs();
renderCard();
renderAssets();
renderBudget();
