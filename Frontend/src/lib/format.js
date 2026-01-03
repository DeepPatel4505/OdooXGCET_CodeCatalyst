import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(relativeTime)
dayjs.extend(customParseFormat)

export function formatDate(date, format = 'MMM DD, YYYY') {
  if (!date) return '-'
  return dayjs(date).format(format)
}


export function formatDateTime(date) {
  if (!date) return '-'
  return dayjs(date).format('MMM DD, YYYY HH:mm')
}


export function formatTime(date) {
  if (!date) return '-'
  return dayjs(date).format('HH:mm')
}

export function formatRelativeTime(date) {
  if (!date) return '-'
  return dayjs(date).fromNow()
}


export function formatCurrency(amount, currency = 'INR') {
  if (amount === null || amount === undefined) return '-'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}


export function formatPercentage(value, decimals = 2) {
  if (value === null || value === undefined) return '-'
  return `${value.toFixed(decimals)}%`
}


export function formatPhone(phone) {
  if (!phone) return '-'
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

