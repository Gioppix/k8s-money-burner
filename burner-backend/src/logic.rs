/// Computes n-th Fibonacci number.
///
/// Slow by design.
pub fn fib(n: u64) -> u64 {
    if n == 0 || n == 1 {
        return 1;
    }

    fib(n - 1) + fib(n - 2)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fib() {
        assert_eq!(fib(0), 1);
        assert_eq!(fib(1), 1);
        assert_eq!(fib(2), 2);
        assert_eq!(fib(3), 3);
        assert_eq!(fib(4), 5);
        assert_eq!(fib(5), 8);
        assert_eq!(fib(6), 13);
        assert_eq!(fib(7), 21);
    }
}
