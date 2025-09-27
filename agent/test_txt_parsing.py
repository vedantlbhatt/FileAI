from parser import parse_txt  # assuming your function is saved in parser.py

if __name__ == "__main__":
    text = parse_txt("example.txt")
    print("---- Parsed Semantic Text ----")
    print(text)
