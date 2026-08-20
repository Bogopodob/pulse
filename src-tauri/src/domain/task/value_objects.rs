//! Value objects и бизнес-правила домена задачи.

/// Период времени в unix-миллисекундах (UTC).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TimeRange {
    pub start: i64,
    pub end: i64,
}

impl TimeRange {
    pub fn new(start: i64, end: i64) -> Result<Self, TaskValidationError> {
        if end < start {
            return Err(TaskValidationError::InvalidPeriod { start, end });
        }
        Ok(Self { start, end })
    }

    pub fn contains(&self, t: i64) -> bool {
        self.start <= t && t <= self.end
    }

    pub fn overlaps(&self, other: &TimeRange) -> bool {
        self.start <= other.end && other.start <= self.end
    }
}

/// Минуты от полуночи (0..=1440).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Minutes(pub i32);

impl Minutes {
    pub fn new(m: i32) -> Result<Self, TaskValidationError> {
        if !(0..=1440).contains(&m) {
            return Err(TaskValidationError::InvalidMinutes(m));
        }
        Ok(Self(m))
    }
}

#[derive(Debug, thiserror::Error)]
pub enum TaskValidationError {
    #[error("title must not be empty")]
    EmptyTitle,
    #[error("invalid period: start {start} > end {end}")]
    InvalidPeriod { start: i64, end: i64 },
    #[error("invalid minutes: {0}")]
    InvalidMinutes(i32),
    #[error("progress must be in 0..=1, got {0}")]
    InvalidProgress(f64),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn range_overlaps() {
        let a = TimeRange::new(0, 100).unwrap();
        assert!(a.overlaps(&TimeRange::new(50, 150).unwrap()));
        assert!(a.overlaps(&TimeRange::new(100, 200).unwrap()));
        assert!(!a.overlaps(&TimeRange::new(101, 200).unwrap()));
        assert!(a.contains(50));
        assert!(!a.contains(101));
    }

    #[test]
    fn range_rejects_inverted() {
        assert!(TimeRange::new(100, 50).is_err());
    }
}