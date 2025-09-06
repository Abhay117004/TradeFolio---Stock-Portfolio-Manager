export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    }).format(amount);
};

export const formatPercent = (value, decimals = 2) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
};

export const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
};

export const getChangeClass = (value) => {
    return value >= 0 ? 'positive' : 'negative';
};