#[macro_export]
macro_rules! get_env {
    ($name:expr, $type:ty) => {{
        let value = std::env::var($name).unwrap_or_else(|_| {
            eprintln!("{} environment variable is not set", $name);
            std::process::exit(1);
        });

        value.parse::<$type>().unwrap_or_else(|_| {
            eprintln!("{} must be a valid {}", $name, stringify!($type));
            std::process::exit(1);
        })
    }};
}
