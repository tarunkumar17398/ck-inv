import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parsePriceLabel } from "@/lib/utils";

const UpdateBrassPrices = () => {
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState("");

  // Price data from Excel: A=thousands, B=hundreds, C=tens
  const priceData: { [key: string]: string } = {
    "CKBR0005": "A15B2C0",
    "CKBR0008": "A12B2C0",
    "CKBR0009": "A15B8C0",
    "CKBR0013": "A9B8C0",
    "CKBR0014": "A6B2C0",
    "CKBR0015": "A5B8C0",
    "CKBR0017": "A6B2C0",
    "CKBR0019": "A4B6C0",
    "CKBR0021": "A4B8C0",
    "CKBR0023": "A26B8C0",
    "CKBR0024": "A31B8C0",
    "CKBR0025": "A16B2C0",
    "CKBR0030": "A17B8C0",
    "CKBR0031": "A27B8C0",
    "CKBR0033": "A12B2C0",
    "CKBR0038": "A6B4C0",
    "CKBR0039": "A6B4C0",
    "CKBR0044": "A5B6C0",
    "CKBR0045": "A6B5C0",
    "CKBR0049": "A3B2C0",
    "CKBR0055": "A4B6C0",
    "CKBR0057": "A3B2C0",
    "CKBR0069": "A8B8C0",
    "CKBR0082": "A24B5C0",
    "CKBR0086": "A8B2C0",
    "CKBR0090": "A11B8C0",
    "CKBR0093": "A196B2C0",
    "CKBR0094": "A76B2C0",
    "CKBR0104": "A11B8C0",
    "CKBR0105": "A11B8C0",
    "CKBR0106": "A26B8C0",
    "CKBR0107": "A26B8C0",
    "CKBR0108": "A41B8C0",
    "CKBR0109": "A41B8C0",
    "CKBR0112": "A9B8C0",
    "CKBR0123": "A68B8C0",
    "CKBR0125": "A59B8C0",
    "CKBR0134": "A26B8C0",
    "CKBR0137": "A23B6C0",
    "CKBR0139": "A20B8C0",
    "CKBR0140": "A12B8C0",
    "CKBR0143": "A19B8C0",
    "CKBR0146": "A9B8C0",
    "CKBR0148": "A10B8C0",
    "CKBR0149": "A12B8C0",
    "CKBR0150": "A16B8C0",
    "CKBR0155": "A7B6C0",
    "CKBR0157": "A4B8C0",
    "CKBR0160": "A7B8C0",
    "CKBR0161": "A4B4C0",
    "CKBR0163": "A3B4C0",
    "CKBR0173": "A1B1C0",
    "CKBR0180": "AB9C0",
    "CKBR0189": "A19B8C0",
    "CKBR0197": "A14B8C0",
    "CKBR0198": "A13B8C0",
    "CKBR0201": "A5B8C0",
    "CKBR0203": "A5B9C0",
    "CKBR0207": "A2B8C0",
    "CKBR0209": "A4B4C0",
    "CKBR0217": "A5B2C0",
    "CKBR0219": "A5B4C0",
    "CKBR0221": "A4B8C0",
    "CKBR0224": "A2B1C0",
    "CKBR0231": "A2B8C0",
    "CKBR0233": "A7B4C0",
    "CKBR0234": "A7B4C0",
    "CKBR0238": "A30B8C0",
    "CKBR0239": "A8B8C0",
    "CKBR0240": "A7B8C0",
    "CKBR0241": "A20B8C0",
    "CKBR0243": "A24B8C0",
    "CKBR0246": "A9B8C0",
    "CKBR0248": "A7B2C0",
    "CKBR0251": "A2B1C0",
    "CKBR0252": "A4B2C0",
    "CKBR0256": "A4B2C0",
    "CKBR0257": "A2B4C0",
    "CKBR0259": "A2B8C0",
    "CKBR0260": "A3B6C0",
    "CKBR0261": "A4B2C0",
    "CKBR0267": "A4B2C0",
    "CKBR0316": "A7B8C0",
    "CKBR0351": "A4B4C0",
    "CKBR0352": "A2B8C0",
    "CKBR0365": "A3B6C0",
    "CKBR0370": "A10B8C0",
    "CKBR0371": "A6B8C0",
    "CKBR0372": "A5B8C0",
    "CKBR0373": "A7B8C0",
    "CKBR0384": "A4B6C0",
    "CKBR0385": "A3B2C0",
    "CKBR0386": "A6B4C0",
    "CKBR0389": "A4B6C0",
    "CKBR0396": "A2B1C0",
    "CKBR0411": "A1B8C0",
    "CKBR0420": "A1B4C0",
    "CKBR0425": "A3B8C0",
    "CKBR0460": "A1B6C0",
    "CKBR0475": "A19B8C5",
    "CKBR0476": "A5B0C5",
    "CKBR0478": "A2B8C5",
    "CKBR0479": "A3B5C5",
    "CKBR0481": "A1B2C5",
    "CKBR0482": "A2B7C0",
    "CKBR0483": "A6B2C0",
    "CKBR0484": "A3B0C5",
    "CKBR0485": "A7B5C0",
    "CKBR0492": "A3B4C5",
    "CKBR0495": "A3B4C0",
    "CKBR0497": "A2B3C0",
    "CKBR0498": "A1B9C0",
    "CKBR0501": "A2B6C0",
    "CKBR0502": "A5B2C5",
    "CKBR0503": "A2B2C0",
    "CKBR0504": "A2B6C0",
    "CKBR0505": "A4B1C5",
    "CKBR0506": "A4B4C0",
    "CKBR0509": "A3B3C0",
    "CKBR0510": "A3B2C5",
    "CKBR0512": "A4B5C0",
    "CKBR0513": "A24B5C0",
    "CKBR0516": "A20B1C0",
    "CKBR0517": "A27B1C5",
    "CKBR0518": "A29B6C0",
    "CKBR0523": "A6B4C0",
    "CKBR0524": "A2B6C5",
    "CKBR0526": "A5B6C0",
    "CKBR0527": "A3B3C0",
    "CKBR0530": "A2B9C5",
    "CKBR0531": "A3B1C0",
    "CKBR0532": "A3B3C0",
    "CKBR0536": "A11B0C0",
    "CKBR0538": "A11B7C5",
    "CKBR0540": "A31B9C0",
    "CKBR0542": "A31B2C0",
    "CKBR0543": "A3B6C0",
    "CKBR0548": "A2B7C5",
    "CKBR0549": "A3B0C0",
    "CKBR0553": "A3B5C0",
    "CKBR0554": "A5B6C5",
    "CKBR0557": "A5B5C5",
    "CKBR0559": "A5B8C0",
    "CKBR0560": "A4B1C7",
    "CKBR0561": "A5B1C0",
    "CKBR0562": "A4B2C0",
    "CKBR0567": "A4B7C5",
    "CKBR0568": "A3B9C0",
    "CKBR0569": "A3B5C0",
    "CKBR0572": "A7B1C5",
    "CKBR0573": "A2B3C0",
    "CKBR0574": "A4B1C7",
    "CKBR0575": "A6B5C0",
    "CKBR0577": "A3B8C5",
    "CKBR0578": "A7B7C5",
    "CKBR0579": "A12B5C0",
    "CKBR0582": "A10B0C0",
    "CKBR0583": "A17B9C5",
    "CKBR0585": "A3B6C0",
    "CKBR0587": "A2B7C0",
    "CKBR0588": "A1B8C0",
    "CKBR0590": "A2B6C0",
    "CKBR0591": "A9B2C5",
    "CKBR0594": "A3B7C5",
    "CKBR0595": "A3B9C0",
    "CKBR0596": "A3B2C0",
    "CKBR0600": "AB7C0",
    "CKBR0603": "A19B0C0",
    "CKBR0604": "A22B2C0",
    "CKBR0605": "A7B2C0",
    "CKBR0607": "A7B2C0",
    "CKBR0608": "A1B1C0",
    "CKBR0609": "A1B9C0",
    "CKBR0610": "A6B7C5",
    "CKBR0613": "A7B8C0",
    "CKBR0614": "A2B2C0",
    "CKBR0615": "AB8C0",
    "CKBR0616": "A2B8C0",
    "CKBR0617": "A4B8C0",
    "CKBR0618": "A12B8C0",
    "CKBR0619": "A4B4C5",
    "CKBR0620": "A2B9C0",
    "CKBR0621": "A2B6C0",
    "CKBR0625": "A4B1C5",
    "CKBR0626": "A3B9C0",
    "CKBR0631": "A3B6C0",
    "CKBR0634": "A9B8C0",
    "CKBR0635": "A2B6C0",
    "CKBR0636": "A4B4C0",
    "CKBR0639": "A5B5C0",
    "CKBR0640": "A2B8C0",
    "CKBR0642": "A5B8C0",
    "CKBR0643": "A2B7C5",
    "CKBR0644": "A5B8C0",
    "CKBR0647": "A2B9C0",
    "CKBR0649": "A4B4C0",
    "CKBR0650": "A2B7C5",
    "CKBR0652": "A3B6C0",
    "CKBR0653": "A5B7C0",
    "CKBR0656": "A1B3C0",
    "CKBR0657": "A1B8C0",
    "CKBR0659": "A2B6C5",
    "CKBR0665": "A5B1C0",
    "CKBR0668": "A5B4C0",
    "CKBR0669": "A2B2C0",
    "CKBR0670": "A2B2C0",
    "CKBR0671": "A2B5C5",
    "CKBR0673": "A5B6C0",
    "CKBR0674": "A2B6C0",
    "CKBR0676": "A3B4C0",
    "CKBR0679": "A2B8C0",
    "CKBR0681": "A4B6C0",
    "CKBR0682": "A3B8C0",
    "CKBR0684": "A2B8C0",
    "CKBR0687": "A2B6C0",
    "CKBR0694": "A2B6C0",
    "CKBR0698": "A4B0C7",
    "CKBR0699": "A7B6C0",
    "CKBR0700": "A6B2C0",
    "CKBR0701": "A2B6C0",
    "CKBR0703": "A1B8C0",
    "CKBR0705": "A2B6C0",
    "CKBR0708": "A2B1C0",
    "CKBR0709": "A1B6C0",
    "CKBR0712": "A1B8C0",
    "CKBR0713": "A1B6C0",
    "CKBR0715": "A1B8C0",
    "CKBR0716": "A3B1C0",
    "CKBR0720": "A2B8C0",
    "CKBR0721": "A1B8C0",
    "CKBR0722": "A1B8C0",
    "CKBR0723": "A2B6C0",
    "CKBR0724": "A3B3C0",
    "CKBR0725": "A7B6C0",
    "CKBR0726": "A7B4C0",
    "CKBR0727": "A1B7C0",
    "CKBR0729": "A3B8C0",
    "CKBR0734": "A2B6C0",
    "CKBR0735": "A3B6C0",
    "CKBR0736": "A16B5C0",
    "CKBR0737": "A8B8C0",
    "CKBR0739": "A2B4C0",
    "CKBR0740": "A2B4C0",
    "CKBR0741": "A2B8C0",
    "CKBR0742": "A4B9C0",
    "CKBR0743": "A3B3C0",
    "CKBR0744": "A1B2C0",
    "CKBR0745": "A4B6C0",
    "CKBR0746": "A6B8C0",
    "CKBR0747": "A3B4C0",
    "CKBR0748": "A8B2C0",
    "CKBR0749": "A4B1C0",
    "CKBR0750": "A4B8C0",
    "CKBR0755": "A7B2C0",
    "CKBR0758": "A3B1C0",
    "CKBR0760": "A2B6C0",
    "CKBR0763": "A2B7C0",
    "CKBR0764": "A5B8C0",
    "CKBR0765": "A7B8C0",
    "CKBR0766": "A7B8C0",
    "CKBR0770": "A11B2C0",
    "CKBR0774": "A4B2C0",
    "CKBR0775": "A2B2C0",
    "CKBR0778": "A1B3C0",
    "CKBR0779": "AB9C0",
    "CKBR0780": "A5B8C0",
    "CKBR0784": "A2B1C0",
    "CKBR0787": "A5B1C0",
    "CKBR0788": "A9B8C0",
    "CKBR0789": "A9B8C0",
    "CKBR0790": "A17B8C0",
    "CKBR0794": "A15B5C0",
    "CKBR0795": "A5B8C0",
    "CKBR0798": "A7B4C0",
    "CKBR0799": "A20B2C0",
    "CKBR0801": "A9B6C0",
    "CKBR0802": "A9B6C0",
    "CKBR0803": "A9B6C0",
    "CKBR0804": "A7B8C0",
    "CKBR0806": "A10B5C0",
    "CKBR0807": "A10B5C0",
    "CKBR0810": "A4B8C0",
    "CKBR0814": "A3B8C0",
    "CKBR0815": "A19B8C0",
    "CKBR0816": "A9B8C0",
    "CKBR0817": "A4B2C0",
    "CKBR0818": "A7B8C0",
    "CKBR0819": "A29B8C0",
    "CKBR0822": "A7B4C0",
    "CKBR0823": "A61B4C0",
    "CKBR0824": "A7B7C0",
    "CKBR0825": "A15B4C0",
    "CKBR0827": "A6B6C0",
    "CKBR0829": "A8B4C0",
    "CKBR0830": "A8B4C0",
    "CKBR0832": "A16B8C0",
    "CKBR0834": "A10B4C0",
    "CKBR0835": "A17B4C0",
    "CKBR0839": "A16B4C0",
    "CKBR0840": "A24B8C0",
    "CKBR0841": "A4B2C0",
    "CKBR0842": "A3B6C0",
    "CKBR0843": "A2B1C0",
    "CKBR0844": "A19B8C0",
    "CKBR0845": "A7B8C0",
    "CKBR0849": "A1B8C0",
    "CKBR0855": "A11B8C0",
    "CKBR0857": "AB9C0",
    "CKBR0860": "A1B8C0",
    "CKBR0861": "A18B8C0",
    "CKBR0863": "A9B8C0",
    "CKBR0867": "A3B8C0",
    "CKBR0868": "A3B8C0",
    "CKBR0869": "A3B8C0",
    "CKBR0870": "A7B8C0",
    "CKBR0871": "A2B8C0",
    "CKBR0872": "A1B8C0",
    "CKBR0873": "A20B8C0",
    "CKBR0874": "A2B2C0",
    "CKBR0875": "A3B8C0",
    "CKBR0876": "A4B4C0",
    "CKBR0878": "A3B8C0",
    "CKBR0879": "A5B8C0",
    "CKBR0880": "A12B8C0",
    "CKBR0881": "A1B8C0",
    "CKBR0882": "A6B8C0",
    "CKBR0883": "A6B8C0",
    "CKBR0884": "A4B4C0",
    "CKBR0885": "A4B8C0",
    "CKBR0886": "A3B2C0",
    "CKBR0887": "A3B8C0",
    "CKBR0890": "A2B2C0",
    "CKBR0891": "A4B2C0",
    "CKBR0892": "A4B4C0",
    "CKBR0893": "A4B2C0",
    "CKBR0894": "A12B8C0",
    "CKBR0896": "A12B8C0",
    "CKBR0898": "A11B4C0",
    "CKBR0899": "A8B8C0",
    "CKBR0900": "A9B8C0",
    "CKBR0904": "A8B2C0",
    "CKBR0905": "A8B8C0",
    "CKBR0906": "A4B4C0",
    "CKBR0907": "A1B1C0",
    "CKBR0908": "A4B2C0",
    "CKBR0909": "A2B4C0",
    "CKBR0910": "A2B4C0",
    "CKBR0911": "A2B8C0",
    "CKBR0912": "A2B8C0",
    "CKBR0913": "A2B8C0",
    "CKBR0914": "A1B8C0",
    "CKBR0915": "A1B2C0",
    "CKBR0916": "A2B4C0",
    "CKBR0917": "A1B2C0",
    "CKBR0918": "A7B8C0",
    "CKBR0919": "A7B8C0",
    "CKBR0920": "A11B8C0",
    "CKBR0922": "A9B0C0",
    "CKBR0924": "A1B2C0",
    "CKBR0925": "A1B2C0",
    "CKBR0926": "A1B2C0",
    "CKBR0927": "A1B2C0",
    "CKBR0928": "A1B2C0",
    "CKBR0929": "A1B2C0",
    "CKBR0931": "A1B8C0",
    "CKBR0932": "A2B8C0",
    "CKBR0933": "A5B8C0",
    "CKBR0935": "A2B4C0",
    "CKBR0936": "A5B8C0",
    "CKBR0937": "A5B8C0",
    "CKBR0938": "A18B8C0",
    "CKBR0939": "A51B8C0",
    "CKBR0940": "A36B8C0",
    "CKBR0945": "A3B8C0",
    "CKBR0957": "AB3C9",
    "CKBR0975": "A3B4C0",
    "CKBR0976": "A29B8C0",
    "CKBR0984": "A14B8C0",
    "CKBR0986": "A6B6C0",
    "CKBR0987": "A6B6C0",
    "CKBR0988": "A15B8C0",
    "CKBR0989": "A11B8C0",
    "CKBR0990": "A6B4C0",
    "CKBR0999": "A5B2C0",
    "CKBR1002": "A4B2C0",
    "CKBR1006": "A3B2C0",
    "CKBR1008": "A3B2C0",
    "CKBR1017": "A2B2C0",
    "CKBR1021": "A2B3C0",
    "CKBR1023": "A9B2C0",
    "CKBR1034": "A7B4C0",
    "CKBR1035": "A38B8C0",
    "CKBR1038": "A1B8C0",
    "CKBR1052": "0",
    "CKBR1060": "A19B8C0",
    "CKBR1062": "A10B8C0",
    "CKBR1066": "A12B8C0",
    "CKBR1067": "A12B8C0",
    "CKBR1068": "A8B8C0",
    "CKBR1071": "A11B8C0",
    "CKBR1078": "A7B2C0",
    "CKBR1079": "A9B8C0",
    "CKBR1080": "A18B8C0",
    "CKBR1081": "A12B8C0",
    "CKBR1083": "A6B8C0",
    "CKBR1084": "A11B8C0",
    "CKBR1085": "A5B8C0"
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    setProgress("Starting update...");

    try {
      let updated = 0;
      let notFound = 0;
      const totalItems = Object.keys(priceData).length;

      // Process items in batches
      for (const [itemCode, priceLabel] of Object.entries(priceData)) {
        const price = parsePriceLabel(priceLabel);
        
        const { error } = await supabase
          .from("items")
          .update({ price })
          .eq("item_code", itemCode);

        if (error) {
          console.error(`Error updating ${itemCode}:`, error);
          notFound++;
        } else {
          updated++;
        }

        if (updated % 10 === 0) {
          setProgress(`Updated ${updated} of ${totalItems} items...`);
        }
      }

      setProgress(`Complete! Updated ${updated} items. ${notFound} not found.`);
      
      toast.success(`Successfully updated ${updated} brass items`, {
        description: notFound > 0 ? `${notFound} items not found in database` : undefined
      });

    } catch (error) {
      console.error("Update failed:", error);
      toast.error("Failed to update prices");
      setProgress("Update failed");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Update Brass Prices</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Update Selling Prices</CardTitle>
            <CardDescription>
              This will update all brass (BR) items with the new selling prices from the Excel file.
              Price format: A=thousands, B=hundreds, C=tens (e.g., A15B2C0 = ₹15,200)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Ready to update:</p>
              <p className="text-2xl font-bold">{Object.keys(priceData).length} items</p>
            </div>

            {progress && (
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium text-primary">{progress}</p>
              </div>
            )}

            <Button 
              onClick={handleUpdate} 
              disabled={isUpdating}
              className="w-full"
              size="lg"
            >
              {isUpdating ? "Updating..." : "Update All Brass Prices"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UpdateBrassPrices;
