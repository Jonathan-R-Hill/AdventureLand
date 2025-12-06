namespace AdventureApi.Dtos
{
    public class CharacterInfo
    {
        public string Name { get; set; }
        public string Class { get; set; }
        public int Str { get; set; }
        public int Intel { get; set; }
        public int Dex { get; set; }
        public int Vit { get; set; }
        public int Speed { get; set; }
        public int Armor { get; set; }
        public int Resistance { get; set; }
        public int CurrentHealth { get; set; }
        public int MaxHealth { get; set; }
        public int CurrentMana { get; set; }
        public int MaxMana { get; set; }
        public int InventoryUsage { get; set; }
        public int InventorySpace { get; set; }
    }
}
