import express from 'express';
import multer from 'multer';
import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import ical from 'ical-generator';

const router = express.Router();

// Configure multer
const upload = multer({ dest: 'uploads/' });

// OCR endpoint
router.post('/ocr', upload.single('schedule'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Get language preference from request
        const language = req.body.language || 'both';
        let ocrLanguage = 'eng';
        let charWhitelist = '0123456789:/-. ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

        if (language === 'hebrew') {
            ocrLanguage = 'heb';
            charWhitelist = 'אבגדהוזחטיכלמנסעפצקרשת0123456789:/-. ';
        } else if (language === 'english') {
            ocrLanguage = 'eng';
            charWhitelist = '0123456789:/-. ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        } else {
            ocrLanguage = 'heb+eng';
            charWhitelist = 'אבגדהוזחטיכלמנסעפצקרשת0123456789:/-. ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        }

        const { data: { text } } = await Tesseract.recognize(req.file.path, ocrLanguage, {
            logger: m => console.log(m),
            tessedit_pageseg_mode: '6', // Uniform block of text
            tessedit_char_whitelist: charWhitelist,
            preserve_interword_spaces: '1'
        });

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({ text });
    } catch (error) {
        console.error('OCR Error:', error);
        res.status(500).json({ error: 'OCR processing failed' });
    }
});

// Parse shifts from OCR text
router.post('/parse-shifts', (req, res) => {
    try {
        const { text, employeeName } = req.body;
        const shifts = parseShiftsFromText(text, employeeName);
        res.json({ shifts });
    } catch (error) {
        console.error('Parse Error:', error);
        res.status(500).json({ error: 'Failed to parse shifts' });
    }
});

// Calculate earnings
router.post('/calculate-earnings', (req, res) => {
    try {
        const { shifts, payRates } = req.body;
        const earnings = calculateEarnings(shifts, payRates);
        res.json({ earnings });
    } catch (error) {
        console.error('Calculation Error:', error);
        res.status(500).json({ error: 'Failed to calculate earnings' });
    }
});

// Generate calendar file
router.post('/generate-calendar', (req, res) => {
    try {
        const { shifts, options = {} } = req.body;
        const calendar = generateICalendar(shifts, options);

        const filename = `${options.calendarName || 'work-shifts'}.ics`.replace(/[^a-zA-Z0-9-_]/g, '-');

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(calendar.toString());
    } catch (error) {
        console.error('Calendar Error:', error);
        res.status(500).json({ error: 'Failed to generate calendar' });
    }
});

function parseShiftsFromText(text, employeeName) {
    const shifts = [];
    const lines = text.split('\n').filter(line => line.trim().length > 0);

    console.log('Parsing text for employee:', employeeName);
    console.log('OCR Text lines:', lines);

    // Enhanced parsing for Hebrew schedule tables
    const namePattern = new RegExp(employeeName.replace(/\s+/g, '\\s*'), 'i');

    // Look for common Hebrew shift indicators
    const shiftIndicators = {
        'בוקר': 'morning',
        'ערב': 'evening',
        'לילה': 'night',
        'מחמוד': 'name', // Example name from your schedule
        'הראל': 'name',
        'אריאל': 'name'
    };

    // Date patterns for Hebrew schedules (often in format DD/MM)
    const datePattern = /(\d{1,2})\/(\d{1,2})/g;

    // Try to find table structure
    let foundEmployee = false;
    let currentWeekDates = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Look for date headers (like "3/8", "4/8", etc.)
        const dateMatches = [...line.matchAll(datePattern)];
        if (dateMatches.length >= 3) {
            // This looks like a date header row
            currentWeekDates = dateMatches.map(match => ({
                day: match[1],
                month: match[2],
                fullDate: `2025-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
            }));
            console.log('Found date row:', currentWeekDates);
            continue;
        }

        // Check if this line contains the employee name
        if (namePattern.test(line)) {
            foundEmployee = true;
            console.log('Found employee in line:', line);

            // Parse the shift information from this row
            const words = line.split(/\s+/);
            let shiftCount = 0;

            // Look for shift patterns in the employee row
            for (let j = 0; j < words.length && shiftCount < currentWeekDates.length; j++) {
                const word = words[j];

                // Check for shift type indicators
                if (shiftIndicators[word] && shiftIndicators[word] !== 'name') {
                    if (currentWeekDates[shiftCount]) {
                        const shiftType = shiftIndicators[word];
                        const shiftTimes = getStandardShiftTimes(shiftType);

                        shifts.push({
                            date: currentWeekDates[shiftCount].fullDate,
                            startTime: shiftTimes.start,
                            endTime: shiftTimes.end,
                            type: determineShiftTypeFromStandard(shiftType, currentWeekDates[shiftCount].fullDate)
                        });

                        console.log('Added shift:', {
                            date: currentWeekDates[shiftCount].fullDate,
                            type: shiftType
                        });
                    }
                    shiftCount++;
                }
            }
        }
    }

    // If no structured parsing worked, try the original method
    if (shifts.length === 0) {
        console.log('Falling back to original parsing method');
        return parseShiftsFromTextOriginal(text, employeeName);
    }

    return shifts;
}

function getStandardShiftTimes(shiftType) {
    switch (shiftType) {
        case 'morning':
            return { start: '7:00 AM', end: '3:00 PM' };
        case 'evening':
            return { start: '3:00 PM', end: '11:00 PM' };
        case 'night':
            return { start: '11:00 PM', end: '7:00 AM' };
        default:
            return { start: '9:00 AM', end: '5:00 PM' };
    }
}

function determineShiftTypeFromStandard(shiftType, dateStr) {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();

    // Weekend shifts (Friday and Saturday in Israel)
    if (dayOfWeek === 5 || dayOfWeek === 6) {
        return 'weekend';
    }

    return shiftType === 'night' ? 'night' : 'day';
}

function parseShiftsFromTextOriginal(text, employeeName) {
    // Original parsing logic as fallback
    const shifts = [];
    const lines = text.split('\n');
    const namePattern = new RegExp(employeeName, 'i');
    const timePattern = /(\d{1,2}):(\d{2})\s*(AM|PM|אחה״צ|בבוקר)?/gi;
    const datePattern = /(\d{1,2})[\/\.](\d{1,2})(?:[\/\.](\d{2,4}))?/g;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (namePattern.test(line)) {
            const times = [...line.matchAll(timePattern)];
            const dates = [...line.matchAll(datePattern)];

            if (times.length >= 2 && dates.length >= 1) {
                const startTime = convertHebrewTime(times[0][0]);
                const endTime = convertHebrewTime(times[1][0]);
                const dateMatch = dates[0];
                const date = formatDate(dateMatch[1], dateMatch[2], dateMatch[3]);

                shifts.push({
                    date: date,
                    startTime: startTime,
                    endTime: endTime,
                    type: determineShiftType(startTime, endTime, date)
                });
            }
        }
    }

    return shifts;
}

function convertHebrewTime(timeStr) {
    // Convert Hebrew time indicators to English
    let converted = timeStr
        .replace(/אחה״צ/g, 'PM')
        .replace(/בבוקר/g, 'AM')
        .replace(/אחרי הצהריים/g, 'PM')
        .replace(/לפני הצהריים/g, 'AM');

    // If no AM/PM specified, try to guess based on hour
    if (!/AM|PM/i.test(converted)) {
        const hourMatch = converted.match(/(\d{1,2})/);
        if (hourMatch) {
            const hour = parseInt(hourMatch[1]);
            if (hour >= 6 && hour <= 11) {
                converted += ' AM';
            } else if (hour >= 12 && hour <= 23) {
                converted += ' PM';
            } else if (hour >= 0 && hour <= 5) {
                converted += ' AM';
            }
        }
    }

    return converted;
}

function formatDate(day, month, year) {
    // Default to current year if not provided
    if (!year) {
        year = new Date().getFullYear();
    } else if (year.length === 2) {
        year = '20' + year;
    }

    // Return in MM/DD/YYYY format for consistency
    return `${month.padStart(2, '0')}/${day.padStart(2, '0')}/${year}`;
}

function determineShiftType(startTime, endTime, date) {
    const start = parseTime(startTime);
    const dayOfWeek = new Date(date).getDay();

    // Weekend shifts
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return 'weekend';
    }

    // Night shift (starts after 6 PM or before 6 AM)
    if (start >= 18 || start < 6) {
        return 'night';
    }

    return 'day';
}

function parseTime(timeStr) {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return 0;

    let hours = parseInt(match[1]);
    const period = match[3];

    if (period && period.toUpperCase() === 'PM' && hours !== 12) {
        hours += 12;
    } else if (period && period.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
    }

    return hours;
}

function calculateEarnings(shifts, payRates) {
    let totalEarnings = 0;
    let totalHours = 0;
    const breakdown = {
        regular: 0,
        night: 0,
        overtime125: 0,
        overtime150: 0,
        weekend150: 0,
        weekend187: 0, // Weekend overtime 8-10h (125% × 150%)
        weekend225: 0, // Weekend overtime 10+h (150% × 150%)
        holiday150: 0,
        holiday187: 0, // Holiday overtime 8-10h
        holiday225: 0  // Holiday overtime 10+h
    };

    // Calculate each shift independently (Option B: Per Individual Shift)
    shifts.forEach(shift => {
        const shiftHours = calculateShiftHours(shift.startTime, shift.endTime);
        const baseRate = payRates.day || 50;
        const nightDifferential = payRates.nightDifferential || 5;

        // Determine shift characteristics
        const isWeekend = shift.type === 'weekend' || isWeekendDate(shift.date);
        const isHoliday = shift.holiday || false;
        const isNight = shift.type === 'night' || shift.calendarType === 'night';

        // Calculate effective hourly rate
        let effectiveRate = baseRate;
        if (isNight) {
            effectiveRate += nightDifferential;
        }

        // Apply pay calculation per individual shift
        if (isHoliday) {
            // Holiday pay: 150% base + overtime rules per shift
            applyHolidayPayPerShift(shiftHours, effectiveRate, breakdown);
        } else if (isWeekend) {
            // Weekend pay: 150% base + overtime rules per shift
            applyWeekendPayPerShift(shiftHours, effectiveRate, breakdown);
        } else {
            // Regular weekday pay with overtime per shift
            applyRegularPayPerShift(shiftHours, effectiveRate, breakdown, isNight);
        }

        totalHours += shiftHours;
    });

    // Calculate total earnings
    totalEarnings = Object.values(breakdown).reduce((sum, value) => sum + value, 0);

    return {
        totalEarnings,
        totalHours,
        breakdown
    };
}

function groupShiftsByWeek(shifts) {
    const weeks = {};

    shifts.forEach(shift => {
        const date = new Date(shift.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeks[weekKey]) {
            weeks[weekKey] = [];
        }
        weeks[weekKey].push(shift);
    });

    return weeks;
}

function calculateShiftHours(startTime, endTime) {
    const start = parseTime(startTime);
    const end = parseTime(endTime);

    if (end > start) {
        return end - start;
    } else {
        // Overnight shift
        return (24 - start) + end;
    }
}

function generateICalendar(shifts, options = {}) {
    const calendarName = options.calendarName || 'Work Shifts';
    const descriptionTemplate = options.eventDescription || 'Work shift\\nType: [SHIFT_TYPE]\\nDuration: [HOURS] hours\\nRate: ₪[RATE]/hour';

    const calendar = ical({
        name: calendarName,
        description: 'Work shift schedule generated by Shift Scheduler',
        timezone: 'Asia/Jerusalem' // Israeli timezone
    });

    shifts.forEach(shift => {
        try {
            const startDate = parseShiftDateTime(shift.date, shift.startTime);
            const endDate = parseShiftDateTime(shift.date, shift.endTime);

            // Handle overnight shifts
            if (endDate <= startDate) {
                endDate.setDate(endDate.getDate() + 1);
            }

            const hours = (endDate - startDate) / (1000 * 60 * 60);
            const rate = calculateShiftRate(shift.type, hours);

            // Generate description from template
            const description = descriptionTemplate
                .replace(/\[SHIFT_TYPE\]/g, getShiftTypeHebrew(shift.type))
                .replace(/\[HOURS\]/g, hours.toFixed(1))
                .replace(/\[RATE\]/g, rate.toFixed(2))
                .replace(/\[LOCATION\]/g, options.location || 'Workplace')
                .replace(/\\n/g, '\n');

            const alarms = generateReminders(options.reminders || {});

            calendar.createEvent({
                start: startDate,
                end: endDate,
                summary: `${getShiftTypeHebrew(shift.type)} - Work Shift`,
                description: description,
                location: options.location || '',
                categories: [{ name: 'Work' }, { name: 'Shift' }],
                alarms: alarms,
                busystatus: 'BUSY'
            });
        } catch (error) {
            console.error('Error creating calendar event for shift:', shift, error);
        }
    });

    return calendar;
}

function parseShiftDateTime(dateStr, timeStr) {
    // Handle different date formats
    let date;
    if (dateStr.includes('-')) {
        date = new Date(dateStr);
    } else {
        // Handle MM/DD format
        const [month, day] = dateStr.split('/');
        date = new Date(new Date().getFullYear(), month - 1, day);
    }

    // Parse time
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const period = timeMatch[3];

        if (period && period.toUpperCase() === 'PM' && hours !== 12) {
            hours += 12;
        } else if (period && period.toUpperCase() === 'AM' && hours === 12) {
            hours = 0;
        }

        date.setHours(hours, minutes, 0, 0);
    }

    return date;
}

function calculateShiftRate(shiftType, hours) {
    const baseRate = 50; // Default base rate

    if (shiftType === 'weekend') {
        if (hours > 10) return baseRate * 2.0; // 200%
        return baseRate * 1.5; // 150%
    }

    if (hours > 10) return baseRate * 1.5; // 150%
    if (hours > 8) return baseRate * 1.25; // 125%
    return baseRate; // 100%
}

function getShiftTypeHebrew(type) {
    const types = {
        'day': 'בוקר',
        'morning': 'בוקר',
        'evening': 'ערב',
        'night': 'לילה',
        'weekend': 'סוף שבוע'
    };
    return types[type] || type;
}

function isWeekendDate(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDay();
    return day === 5 || day === 6; // Friday or Saturday
}

function generateReminders(reminderSettings) {
    const alarms = [];

    try {
        // 1 hour before reminder
        if (reminderSettings.reminder1Hour) {
            alarms.push({
                type: 'display',
                trigger: 60 * 60, // 1 hour in seconds
                description: 'Work shift starts in 1 hour / המשמרת מתחילה בעוד שעה'
            });
        }

        // 1 day before reminder
        if (reminderSettings.reminder1Day) {
            alarms.push({
                type: 'display',
                trigger: 24 * 60 * 60, // 1 day in seconds
                description: 'Work shift tomorrow / משמרת מחר'
            });
        }

        // Custom reminder
        if (reminderSettings.customReminderEnabled && reminderSettings.customReminderValue) {
            let seconds = reminderSettings.customReminderValue;
            let timeUnit = 'minutes';

            switch (reminderSettings.customReminderUnit) {
                case 'hours':
                    seconds *= 60;
                    timeUnit = seconds === 60 ? 'hour' : 'hours';
                    break;
                case 'days':
                    seconds *= 60 * 24;
                    timeUnit = seconds === 1440 ? 'day' : 'days';
                    break;
                default: // minutes
                    timeUnit = seconds === 1 ? 'minute' : 'minutes';
            }

            seconds *= 60; // Convert to seconds for calendar

            const hebrewTimeUnit = {
                'minute': 'דקה',
                'minutes': 'דקות',
                'hour': 'שעה',
                'hours': 'שעות',
                'day': 'יום',
                'days': 'ימים'
            }[timeUnit] || 'דקות';

            alarms.push({
                type: 'display',
                trigger: seconds,
                description: `Work shift in ${reminderSettings.customReminderValue} ${timeUnit} / משמרת בעוד ${reminderSettings.customReminderValue} ${hebrewTimeUnit}`
            });
        }

        // Default reminder if no reminders are set
        if (alarms.length === 0) {
            alarms.push({
                type: 'display',
                trigger: 30 * 60, // 30 minutes default
                description: 'Work shift starts in 30 minutes / המשמרת מתחילה בעוד 30 דקות'
            });
        }
    } catch (error) {
        console.error('Error generating reminders:', error);
        // Return default reminder on error
        return [{
            type: 'display',
            trigger: 30 * 60,
            description: 'Work shift starts in 30 minutes'
        }];
    }

    return alarms;
}

// Add the missing per-shift pay calculation functions
function applyRegularPayPerShift(shiftHours, effectiveRate, breakdown, isNight) {
    let remainingHours = shiftHours;

    // Regular hours (up to 8 hours per shift)
    if (remainingHours > 0) {
        const regularHours = Math.min(remainingHours, 8);
        const earnings = regularHours * effectiveRate;
        if (isNight) {
            breakdown.night += earnings;
        } else {
            breakdown.regular += earnings;
        }
        remainingHours -= regularHours;
    }

    // Overtime 125% (hours 8-10 per shift)
    if (remainingHours > 0) {
        const overtime125Hours = Math.min(remainingHours, 2); // Max 2 hours at 125%
        const earnings = overtime125Hours * effectiveRate * 1.25;
        breakdown.overtime125 += earnings;
        remainingHours -= overtime125Hours;
    }

    // Overtime 150% (hours above 10 per shift)
    if (remainingHours > 0) {
        const earnings = remainingHours * effectiveRate * 1.5;
        breakdown.overtime150 += earnings;
    }
}

function applyWeekendPayPerShift(shiftHours, effectiveRate, breakdown) {
    let remainingHours = shiftHours;
    const weekendRate = effectiveRate * 1.5; // Weekend base rate is 150%

    // Regular weekend hours (up to 8 hours per shift)
    if (remainingHours > 0) {
        const regularHours = Math.min(remainingHours, 8);
        const earnings = regularHours * weekendRate;
        breakdown.weekend150 += earnings;
        remainingHours -= regularHours;
    }

    // Weekend overtime 8-10 hours per shift (150% + 25% overtime = 175%)
    if (remainingHours > 0) {
        const overtimeHours = Math.min(remainingHours, 2); // Max 2 hours at 175%
        const earnings = overtimeHours * effectiveRate * 1.75;
        breakdown.weekend187 += earnings;
        remainingHours -= overtimeHours;
    }

    // Weekend overtime 10+ hours per shift (150% + 50% overtime = 200%)
    if (remainingHours > 0) {
        const earnings = remainingHours * effectiveRate * 2.0;
        breakdown.weekend225 += earnings;
    }
}

function applyHolidayPayPerShift(shiftHours, effectiveRate, breakdown) {
    let remainingHours = shiftHours;
    const holidayRate = effectiveRate * 1.5; // Holiday base rate is 150%

    // Regular holiday hours (up to 8 hours per shift)
    if (remainingHours > 0) {
        const regularHours = Math.min(remainingHours, 8);
        const earnings = regularHours * holidayRate;
        breakdown.holiday150 += earnings;
        remainingHours -= regularHours;
    }

    // Holiday overtime 8-10 hours per shift (150% + 25% overtime = 175%)
    if (remainingHours > 0) {
        const overtimeHours = Math.min(remainingHours, 2); // Max 2 hours at 175%
        const earnings = overtimeHours * effectiveRate * 1.75;
        breakdown.holiday187 += earnings;
        remainingHours -= overtimeHours;
    }

    // Holiday overtime 10+ hours per shift (150% + 50% overtime = 200%)
    if (remainingHours > 0) {
        const earnings = remainingHours * effectiveRate * 2.0;
        breakdown.holiday225 += earnings;
    }
}

export default router;
