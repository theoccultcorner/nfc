import React, { useCallback, useContext, useEffect, useState } from "react";
import Scanner from "../components/Scanner/Scanner";
import { ActionsContext } from "../contexts/context";
import { GoogleSpreadsheet } from 'google-spreadsheet';
import spreadSheetConfig from "../spreadsheet.json";
import SweetAlert from "react-bootstrap-sweetalert";

const Scan = ({type}) => {
  const doc = new GoogleSpreadsheet(
    "1_nbKCh1f7vW_FYZ1xrkCaykSQwrsHijAvY870VakcQ0"
  );
  const [message, setMessage] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [alert, setalert] = useState(false)
  const [responseType, setresponseType] = useState('success')
  const { actions, setActions } = useContext(ActionsContext);
  const scan = useCallback(async () => {
    if(actions?.type !== ''){
    if ("NDEFReader" in window) {
      try {
        const ndef = new window.NDEFReader();
        await ndef.scan();

        console.log("Scan started successfully.");
        ndef.onreadingerror = () => {
          console.log("Cannot read data from the NFC tag. Try another one?");
        };

        ndef.onreading = (event) => {
          console.log("NDEF message read.");
          new onReading(event);
        };
      } catch (error) {
        console.log(`Error! Scan failed to start: ${error}.`);
      }
    }
  }
  }, [setActions]);

  const [scanned, setScanned] = useState(false);

  const onReading = async ({ message, serialNumber }) => {
    if (scanned) {
      return; // exit if message has already been scanned
    }
  
    setSerialNumber(serialNumber);
    const record = message.records[0];
  
    switch (record.recordType) {
      case "text":
        const textDecoder = new TextDecoder(record.encoding);
        setMessage(textDecoder.decode(record.data));
        /*Google Sheet Code*/
        await doc.useServiceAccountAuth({
          client_email: spreadSheetConfig.client_email,
          private_key: spreadSheetConfig.private_key,
        });
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        await sheet.loadCells('A:B');
        const headers = ["ID", "Type", "Timestamp"];
        await sheet.setHeaderRow(headers);
        const rows = await sheet.getRows();
        const todayRows = rows.filter((row) => {
          const date = new Date(row.Timestamp);
          const today = new Date();
          return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear() && row.ID === textDecoder.decode(record.data) && row.Type === actions.type.toLowerCase();
        });
        if(todayRows.length === 0) {
          await sheet.addRows([
            {
              ID: textDecoder.decode(record.data),
              Type: actions.type.toLowerCase(),
              Timestamp: new Date(),
            },
          ]);
          setActions({
            scan: "scanned",
            write: null,
          });
          setresponseType("success");
          setalert(true);
        } else {
          setresponseType("warning");
          setalert(true);
        }
        setScanned(true); // set scanned to true
        break;
      case "url":
        // TODO: Read URL record with record data.
        break;
      default:
      // TODO: Handle other records with record data.
    }
  };

  useEffect(() => {
   scan();
  }, 
  [actions?.type]);
  return (
   

    <>
      <SweetAlert
        title={"Attendace Marked"}
        onConfirm={()=>{
          setalert(false)
          setresponseType('')
          setActions(null);
        }}
        onCancel={()=>{
          setalert(false)
          setresponseType('')
        }}
        type={responseType}
        // dependencies={[alert]}
        show={alert}
        btnSize="small"
      ></SweetAlert>
      
      {actions.scan === "scanned" ? (
        <div>
           <p>Serial Number: {serialNumber}</p>
          <p>Message: {message}</p> 
        </div>
      ) : (
        <Scanner status={actions.scan}></Scanner>
      )}
    </>
  );
};

export default Scan;
