// Lokalisatie voor Dynamic Prices Card
export const languages = {
  en: {
    no_data: "No data available",
    missing_entity: "Please specify entity in the config",
    label_current_price: "Current price",
    label_average_price: "Average price", 
    label_today_price: "Today's price",
    label_tomorrow_price: "Tomorrow's price",
    unit_cent: "Cent",
    min_price: "Min",
    max_price: "Max",
    now: "Now",
    avg: "Avg"
  },
  nl: {
    no_data: "Geen gegevens beschikbaar",
    missing_entity: "Specificeer de entity in de configuratie",
    label_current_price: "Huidige prijs",
    label_average_price: "Gemiddelde prijs",
    label_today_price: "Prijs van vandaag", 
    label_tomorrow_price: "Prijs van morgen",
    unit_cent: "Cent",
    min_price: "Min",
    max_price: "Max",
    now: "Nu",
    avg: "Gem"
  }
};

export function localize(key, lang = 'en') {
  return languages[lang]?.[key] || languages['en'][key] || key;
}