import sys

if len(sys.argv) < 2:
    print("No filename received")
    sys.exit(1)

filename = sys.argv[1]

try:
    with open(filename, "rb") as f:
        data = f.read()

    print(f"Python received {len(data)} bytes from file: {filename}")

    # Print first 50 bytes (so it's not overwhelming)
    print("First 50 bytes:", data[:75])
    text = data.decode("utf-16")    # decod6e UTF-16 properly
    print("As text:", text)
s

except Exception as e:
    print(f"Error reading file: {e}")
    sys.exit(1)
