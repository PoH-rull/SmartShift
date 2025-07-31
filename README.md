# Shift Scheduler Web App

A comprehensive web application for shift workers to manage their schedules, calculate earnings, and sync with calendars.

## 🌟 Features

- **OCR Schedule Processing**: Upload images of work schedules with Hebrew/English support
- **Earnings Calculator**: Configurable pay rates with overtime and weekend bonuses
- **Calendar Integration**: Export shifts to Google Calendar, Apple Calendar, Outlook
- **Manual Entry**: 3-week visual calendar for quick shift entry
- **Multi-language**: Full Hebrew and English support
- **Holiday Support**: Mark days as holidays with appropriate pay rates

## 🚀 Live Demo

[Your deployed URL will go here]

## 💻 Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd shift-scheduler
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 🌐 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Deploy automatically

### Railway
1. Connect your GitHub repo to Railway
2. Deploy with one click

### Heroku
1. Create a Heroku app
2. Push your code to Heroku

## 📱 Usage

1. **Upload Schedule**: Take a photo of your work schedule and upload it
2. **Enter Your Name**: Type your name as it appears on the schedule
3. **Process**: The app will automatically detect your shifts using OCR
4. **Manual Entry**: Use the 3-week calendar to add shifts manually
5. **Configure Pay**: Set your hourly rates and overtime rules
6. **Export**: Download calendar files to sync with your phone

## 🔧 Configuration

- **Base Pay Rate**: Set your hourly rate in Israeli Shekels (₪)
- **Night Differential**: Extra pay for night shifts
- **Overtime Rules**: Automatic calculation for 8-10h (125%) and 10+h (150%)
- **Weekend/Holiday**: 150% base rate with overtime bonuses

## 🌍 Language Support

- **Hebrew**: Full RTL support with Hebrew OCR
- **English**: Complete English interface
- **Toggle**: Switch languages with one click

## 📊 Pay Calculation

The app uses **per-shift calculation**:
- Each shift calculated independently
- Overtime only applies if single shift > 8 hours
- Weekend/holiday bonuses apply to entire shift
- Night differential added to base rate

## 🗓️ Calendar Integration

Export your shifts to:
- Google Calendar
- Apple Calendar (iPhone/Mac)
- Microsoft Outlook
- Any calendar app that supports .ics files

## 🛠️ Technical Stack

- **Backend**: Node.js, Express
- **OCR**: Tesseract.js with Hebrew support
- **Calendar**: ical-generator
- **Frontend**: Vanilla JavaScript, CSS Grid
- **Storage**: LocalStorage for settings and shifts

## 📄 License

MIT License - feel free to use and modify!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues or questions, please create an issue in the repository.

---

Made with ❤️ for shift workers everywhere